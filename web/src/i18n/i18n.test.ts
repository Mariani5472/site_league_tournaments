import { describe, expect, it } from "vitest";
import { formatDateTime, formatNumber, formatPercent, t, tp } from ".";
import { labelJoinPolicy, labelLobbyStatus, labelRole, labelVisibility } from "./labels";

describe("catálogo pt-BR", () => {
    it("interpola e pluraliza mensagens tipadas", () => {
        expect(t("common.team", { number: 2 })).toBe("Time 2");
        expect(tp(1, { one: "leagues.count.one", other: "leagues.count.other" })).toBe("1 liga");
        expect(tp(2, { one: "leagues.count.one", other: "leagues.count.other" })).toBe("2 ligas");
    });

    it("formata valores com locale explícito", () => {
        expect(formatNumber(1234)).toMatch(/1[.\s]234/);
        expect(formatPercent(0.625)).toBe("63%");
        expect(formatDateTime("2026-08-17T15:30:00Z")).toMatch(/17\/08\/2026/);
    });

    it("não expõe enums crus nas etiquetas de domínio", () => {
        expect(labelRole("owner")).toBe("Proprietário");
        expect(labelVisibility("private")).toBe("Privada");
        expect(labelJoinPolicy("invite_only")).toBe("Somente convidados");
        expect(labelLobbyStatus("in_game")).toBe("Em partida");
    });
});
