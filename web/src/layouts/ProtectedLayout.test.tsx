import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/renderApp";
import { ProtectedLayout } from "./ProtectedLayout";

function routes() {
    return <Routes>
        <Route path="/" element={<p>Public landing</p>} />
        <Route element={<ProtectedLayout />}>
            <Route path="/private" element={<p>Private content</p>} />
        </Route>
    </Routes>;
}

describe("ProtectedLayout", () => {
    it("redirects an unauthenticated user to the public landing", async () => {
        renderApp(routes(), { route: "/private", auth: { user: null } });
        expect(await screen.findByText("Public landing")).toBeVisible();
        expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    });

    it("does not render private content while session initialization is loading", () => {
        renderApp(routes(), { route: "/private", auth: { user: null, loading: true } });
        expect(screen.getByText("Loading...")).toBeVisible();
        expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    });

    it("renders protected content for an authenticated user", () => {
        renderApp(routes(), { route: "/private" });
        expect(screen.getByText("Private content")).toBeVisible();
    });
});
