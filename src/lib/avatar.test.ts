import { describe, expect, it } from "vitest";
import { avatarPathFromUrl, safeAvatarUrl } from "./avatar";

const base = "https://abc.supabase.co";
const uid = "1b4e28ba-2fa1-11d2-883f-0016d3cca427";
const file = "9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f.jpg";
const good = `${base}/storage/v1/object/public/avatars/${uid}/${file}`;

describe("safeAvatarUrl", () => {
  it("aceita a foto do próprio usuário no bucket", () => {
    expect(safeAvatarUrl(good, uid, base)).toBe(good);
    expect(safeAvatarUrl(good, uid, `${base}/`)).toBe(good);
  });

  it("recusa outro domínio, outro usuário ou caminho estranho", () => {
    expect(safeAvatarUrl(`https://evil.com/storage/v1/object/public/avatars/${uid}/${file}`, uid, base)).toBeNull();
    expect(safeAvatarUrl(good, "00000000-0000-0000-0000-000000000000", base)).toBeNull();
    expect(safeAvatarUrl(`${base}/storage/v1/object/public/avatars/${uid}/../x.jpg`, uid, base)).toBeNull();
    expect(safeAvatarUrl(123, uid, base)).toBeNull();
    expect(safeAvatarUrl(good, uid, undefined)).toBeNull();
  });
});

describe("avatarPathFromUrl", () => {
  it("tira o prefixo do bucket", () => {
    expect(avatarPathFromUrl(good, base)).toBe(`${uid}/${file}`);
    expect(avatarPathFromUrl("https://outro.com/x.jpg", base)).toBeNull();
  });
});
