"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PERIOD_COOKIE, formatPeriod, parsePeriod } from "./period";

/**
 * Salva o período escolhido. Passa pelo servidor (e não só por
 * document.cookie) para descartar as páginas já pré-carregadas no
 * navegador, que foram montadas com o período antigo.
 */
export async function savePeriod(value: string) {
  const period = parsePeriod(value);
  if (!period) return;

  const cookieStore = await cookies();
  cookieStore.set(PERIOD_COOKIE, formatPeriod(period), {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
