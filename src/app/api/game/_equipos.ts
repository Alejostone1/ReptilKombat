import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { canalDeVista, generarCodigoSala, generarViewToken, rowToPlayer, type PlayerRecord, type RoomRecord } from "@/lib/supabase/game-queries";
import { publicarEnCanal } from "@/lib/supabase/realtime";
import type { Lado } from "@/lib/card-game/types";
import {
  MAX_CARTAS_MAZO_2V2,
  crearPartidaEquipos,
  invocarEquipos,
  atacarEquipos,
  cambiarEquipos,
  indiceDeAsiento,
  toPublicViewEquipos,
  esEstadoEquipos,
  type EstadoEquipos,
  type ResultadoAtaqueEquipos,
} from "@/lib/card-game/engine-equipos";
import { MINUTOS_VIGENCIA_SALA, evaluarDesconexionEquipos, salaVencida } from "@/lib/card-game/conexion";
import { FEATURES } from "@/config/features";
import { cargarDatosDeJuego, jsonError } from "./_lib";

export interface AsientoLobby {
  nombre: string;
  equipo: Lado;
  asiento: number;
}

type ResultadoSinEstado = Omit<ResultadoAtaqueEquipos, "state">;

export function indiceDeJugador(j: PlayerRecord): number {
  return indiceDeAsiento(j.lado, j.asiento === 2 ? 2 : 1);
}

export function resumenLobby(jugadores: PlayerRecord[]): AsientoLobby[] {
  return jugadores
    .map((j) => ({ nombre: j.nombre, equipo: j.lado, asiento: j.asiento }))
    .sort((a, b) => indiceDeAsiento(a.equipo, a.asiento === 2 ? 2 : 1) - indiceDeAsiento(b.equipo, b.asiento === 2 ? 2 : 1));
}

async function emitirEstadoEquipos(
  estado: EstadoEquipos,
  jugadores: PlayerRecord[],
  opts: { ultimoResultado?: ResultadoSinEstado | null; estadoSala: string; ganador?: Lado | null },
) {
  await Promise.all(
    jugadores.map((j) =>
      publicarEnCanal(canalDeVista(j.viewToken), "estado", {
        estado: toPublicViewEquipos(estado, indiceDeJugador(j)),
        ultimoResultado: opts.ultimoResultado ?? null,
        estadoSala: opts.estadoSala,
        ganador: opts.ganador ?? null,
        lobby: null,
      }),
    ),
  );
}

async function emitirLobby(jugadores: PlayerRecord[]) {
  const lobby = resumenLobby(jugadores);
  await Promise.all(
    jugadores.map((j) =>
      publicarEnCanal(canalDeVista(j.viewToken), "estado", { estado: null, ultimoResultado: null, estadoSala: "WAITING", ganador: null, lobby }),
    ),
  );
}

async function validarMazo(mazo: unknown): Promise<{ ok: true; mazo: string[]; datos: Awaited<ReturnType<typeof cargarDatosDeJuego>> } | { ok: false; error: Response }> {
  if (!Array.isArray(mazo) || mazo.length === 0 || mazo.length > MAX_CARTAS_MAZO_2V2) {
    return { ok: false, error: jsonError(`En 2 vs 2 cada jugador lleva entre 1 y ${MAX_CARTAS_MAZO_2V2} reptiles.`) };
  }
  const datos = await cargarDatosDeJuego();
  const ids = new Set(datos.roster.map((r) => r.id));
  if (!mazo.every((id) => typeof id === "string" && ids.has(id))) return { ok: false, error: jsonError("El mazo contiene reptiles inválidos.") };
  return { ok: true, mazo: mazo as string[], datos };
}

/** Crea una sala 2 vs 2: el anfitrión ocupa el asiento A1 con su mazo ya elegido. */
export async function crearSala2v2(body: { sessionId: string; nombre: string; mazo: unknown }): Promise<Response> {
  if (!FEATURES.MODE_2V2) return jsonError("El modo 2 vs 2 no está disponible.", 403);
  const v = await validarMazo(body.mazo);
  if (!v.ok) return v.error;

  const supabase = createAdminClient();
  let codigo = generarCodigoSala();
  for (let intento = 0; intento < 5; intento++) {
    const { data: existente } = await supabase.from("game_rooms").select("id").eq("codigo", codigo).maybeSingle();
    if (!existente) break;
    codigo = generarCodigoSala();
  }
  const { data: sala, error } = await supabase
    .from("game_rooms")
    .insert({
      codigo,
      modo: "amigo",
      estado_sala: "WAITING",
      formato: "2v2",
      mazo_a: null,
      estado: null,
      expira_en: new Date(Date.now() + MINUTOS_VIGENCIA_SALA * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !sala) return jsonError(error?.message ?? "No se pudo crear la sala.", 500);

  const viewToken = generarViewToken();
  const { error: errorJugador } = await supabase
    .from("game_players")
    .insert({ room_id: sala.id, nombre: body.nombre, lado: "A", asiento: 1, session_id: body.sessionId, view_token: viewToken, mazo: v.mazo });
  if (errorJugador) return jsonError(errorJugador.message, 500);
  return Response.json({ codigo, viewToken });
}

/** Un jugador entra a una sala 2 vs 2: elige equipo (o se asigna el que tenga menos) y, con el 4.º, empieza la partida. */
export async function unirseSala2v2(
  sala: RoomRecord,
  jugadoresActuales: PlayerRecord[],
  body: { sessionId: string; nombre: string; mazo: unknown; equipo?: string },
): Promise<Response> {
  const ya = jugadoresActuales.find((j) => j.sessionId === body.sessionId);
  if (ya) return Response.json({ viewToken: ya.viewToken, equipo: ya.lado, asiento: ya.asiento });
  if (sala.estadoSala === "CANCELLED") return jsonError("Esa partida fue cancelada.", 409);
  if (sala.estadoSala !== "WAITING") return jsonError("Esa partida ya no acepta jugadores.", 409);
  if (salaVencida(sala.expiraEn, Date.now())) return jsonError("Esa sala venció. Pídele a quien la creó que haga una nueva.", 410);
  if (jugadoresActuales.length >= 4) return jsonError("Esa sala ya está llena.", 409);

  const v = await validarMazo(body.mazo);
  if (!v.ok) return v.error;

  const cuenta = (e: Lado) => jugadoresActuales.filter((j) => j.lado === e).length;
  let equipo: Lado;
  if (body.equipo === "A" || body.equipo === "B") {
    if (cuenta(body.equipo) >= 2) return jsonError(`El equipo ${body.equipo} ya está lleno. Elige el otro.`, 409);
    equipo = body.equipo;
  } else {
    equipo = cuenta("A") < cuenta("B") ? "A" : "B";
    if (cuenta(equipo) >= 2) equipo = equipo === "A" ? "B" : "A";
  }
  const asiento = jugadoresActuales.some((j) => j.lado === equipo && j.asiento === 1) ? 2 : 1;

  const supabase = createAdminClient();
  const viewToken = generarViewToken();
  const { error } = await supabase
    .from("game_players")
    .insert({ room_id: sala.id, nombre: body.nombre, lado: equipo, asiento, session_id: body.sessionId, view_token: viewToken, mazo: v.mazo });
  if (error) {
    // Dos personas pidieron el mismo asiento a la vez: el índice único lo rechaza.
    return jsonError(error.code === "23505" ? "Ese asiento se acaba de ocupar. Intenta otra vez." : error.message, error.code === "23505" ? 409 : 500);
  }

  // Se relee la sala completa: si el 4.º en llegar fue otro a la vez, solo uno gana el cambio a IN_PROGRESS.
  const { data: filas } = await supabase.from("game_players").select("*").eq("room_id", sala.id);
  const jugadores = (filas ?? []).map(rowToPlayer);

  if (jugadores.length < 4) {
    await emitirLobby(jugadores);
    return Response.json({ viewToken, equipo, asiento });
  }

  const ordenados = [...jugadores].sort((a, b) => indiceDeJugador(a) - indiceDeJugador(b));
  const estado = crearPartidaEquipos(
    ordenados.map((j) => j.mazo ?? []),
    ordenados.map((j) => j.nombre),
    v.datos.roster,
    v.datos.abilities,
    v.datos.config,
  );
  const ahora = new Date().toISOString();
  const { data: iniciada } = await supabase
    .from("game_rooms")
    .update({ estado, estado_sala: "IN_PROGRESS" })
    .eq("id", sala.id)
    .eq("estado_sala", "WAITING")
    .select("id");
  if (iniciada && iniciada.length > 0) {
    await supabase.from("game_players").update({ last_seen: ahora }).eq("room_id", sala.id);
    await emitirEstadoEquipos(estado, jugadores, { estadoSala: "IN_PROGRESS" });
  }
  return Response.json({ viewToken, equipo, asiento });
}

export type AccionEquipos =
  | { tipo: "invocar"; reptilId: string }
  | { tipo: "cambiar"; reptilId: string }
  | { tipo: "atacar"; habilidadId: string; objetivo: number };

/** Ejecuta la acción de un jugador en una partida 2 vs 2 (servidor autoritativo: valida asiento y turno). */
export async function accionEquipos(sala: RoomRecord, jugadores: PlayerRecord[], yo: PlayerRecord, accion: AccionEquipos): Promise<Response> {
  if (!esEstadoEquipos(sala.estado)) return jsonError("La partida no es 2 vs 2.", 409);
  const estadoActual = sala.estado;
  const idx = indiceDeJugador(yo);
  if (estadoActual.turnoIdx !== idx) return jsonError("No es tu turno.", 409);

  const { roster, config } = await cargarDatosDeJuego();
  let nuevo: EstadoEquipos;
  let ultimoResultado: ResultadoSinEstado | null = null;
  try {
    if (accion.tipo === "invocar") nuevo = invocarEquipos(estadoActual, accion.reptilId, roster);
    else if (accion.tipo === "cambiar") {
      if (!FEATURES.CARD_SWAP) return jsonError("El cambio de carta no está disponible.", 400);
      nuevo = cambiarEquipos(estadoActual, accion.reptilId, roster);
    } else {
      const { state, ...resto } = atacarEquipos(estadoActual, accion.habilidadId, Number(accion.objetivo), config);
      nuevo = state;
      ultimoResultado = resto;
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Acción inválida.", 400);
  }

  const supabase = createAdminClient();
  const terminado = nuevo.fase === "terminado";
  const { error } = await supabase
    .from("game_rooms")
    .update({
      estado: nuevo,
      estado_sala: terminado ? "FINISHED" : "IN_PROGRESS",
      ganador: nuevo.ganador,
      finalizado_en: terminado ? new Date().toISOString() : null,
    })
    .eq("id", sala.id);
  if (error) return jsonError(error.message, 500);

  await supabase.from("game_players").update({ last_seen: new Date().toISOString() }).eq("id", yo.id);
  await supabase.from("game_moves").insert({ room_id: sala.id, lado: yo.lado, accion: { ...accion, asiento: yo.asiento } });

  if (terminado && nuevo.ganador) {
    const reptilesDe = (equipo: Lado) => jugadores.filter((j) => j.lado === equipo).flatMap((j) => j.mazo ?? []);
    await supabase.from("match_results").insert({
      room_id: sala.id,
      ganador_lado: nuevo.ganador,
      reptiles_a: reptilesDe("A"),
      reptiles_b: reptilesDe("B"),
      turnos: nuevo.numeroTurno,
      duracion_segundos: Math.max(0, Math.round((Date.now() - new Date(sala.creadoEn).getTime()) / 1000)),
    });
  }

  await emitirEstadoEquipos(nuevo, jugadores, { ultimoResultado, estadoSala: terminado ? "FINISHED" : "IN_PROGRESS", ganador: nuevo.ganador });
  return Response.json({ estado: toPublicViewEquipos(nuevo, idx), ultimoResultado });
}

/** Latido en 2 vs 2: si alguien lleva más de 60 s sin señal, su equipo pierde por abandono. */
export async function pingEquipos(sala: RoomRecord, jugadores: PlayerRecord[], yo: PlayerRecord): Promise<Response> {
  const supabase = createAdminClient();
  const ahora = Date.now();
  await supabase.from("game_players").update({ last_seen: new Date(ahora).toISOString() }).eq("id", yo.id);

  const base = { estadoSala: sala.estadoSala, ganador: sala.ganador, rivalSegundosSinSenal: 0 };
  if (sala.estadoSala !== "IN_PROGRESS" || !esEstadoEquipos(sala.estado)) return Response.json(base);

  const ev = evaluarDesconexionEquipos(jugadores, { lado: yo.lado, asiento: yo.asiento }, ahora);
  if (!ev.equipoAbandona) return Response.json({ ...base, rivalSegundosSinSenal: ev.maxSegundosSinSenal });

  const ganador: Lado = ev.equipoAbandona === "A" ? "B" : "A";
  const estadoFinal: EstadoEquipos = {
    ...sala.estado,
    fase: "terminado",
    ganador,
    log: [
      ...sala.estado.log,
      { turno: sala.estado.numeroTurno, lado: ganador, tipo: "victoria", mensaje: `Un jugador del equipo ${ev.equipoAbandona} se desconectó: gana el equipo ${ganador} por abandono.` },
    ],
  };
  const { data: cerrada } = await supabase
    .from("game_rooms")
    .update({ estado: estadoFinal, estado_sala: "FINISHED", ganador, finalizado_en: new Date(ahora).toISOString() })
    .eq("id", sala.id)
    .eq("estado_sala", "IN_PROGRESS")
    .select("id");
  if (cerrada && cerrada.length > 0) await emitirEstadoEquipos(estadoFinal, jugadores, { estadoSala: "FINISHED", ganador });
  return Response.json({ estadoSala: "FINISHED", ganador, rivalSegundosSinSenal: ev.maxSegundosSinSenal });
}

/** Respuesta de GET /rooms/[codigo] para una sala 2 vs 2 (vista redactada del jugador + lobby). */
export function vistaSala2v2(sala: RoomRecord, jugadores: PlayerRecord[], yo: PlayerRecord): Response {
  const idx = indiceDeJugador(yo);
  return Response.json({
    codigo: sala.codigo,
    formato: "2v2",
    estadoSala: sala.estadoSala,
    lado: yo.lado,
    asiento: yo.asiento,
    idx,
    viewToken: yo.viewToken,
    nombrePropio: yo.nombre,
    estado: esEstadoEquipos(sala.estado) ? toPublicViewEquipos(sala.estado, idx) : null,
    ganador: sala.ganador,
    lobby: resumenLobby(jugadores),
  });
}
