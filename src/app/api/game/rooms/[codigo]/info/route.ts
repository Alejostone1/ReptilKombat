import { obtenerSala } from "../../../_lib";
import { normalizarCodigo } from "@/lib/utils/sala-qr";
import { salaVencida } from "@/lib/card-game/conexion";

interface Params {
  params: Promise<{ codigo: string }>;
}

/**
 * Estado público mínimo de una sala, para avisar ANTES de elegir mazo ("no existe", "ya está llena",
 * "venció"). No devuelve nombres, mazos ni estado de partida; el código de 6 caracteres ya es el secreto
 * de unión, esto solo confirma si sirve.
 */
export async function GET(_request: Request, { params }: Params) {
  const { codigo: crudo } = await params;
  const codigo = normalizarCodigo(crudo);
  if (!codigo) return Response.json({ existe: false });

  const sala = await obtenerSala(codigo);
  if (!sala) return Response.json({ existe: false });

  const vencida = sala.estadoSala === "WAITING" && salaVencida(sala.expiraEn, Date.now());
  return Response.json({
    existe: true,
    estadoSala: sala.estadoSala,
    formato: sala.formato,
    vencida,
    /** true = ya no acepta jugadores (en curso, terminada, cancelada) o venció. */
    llena: sala.estadoSala !== "WAITING" || vencida,
  });
}
