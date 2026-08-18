import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class ResizeObserverMock implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

if (!window.matchMedia) {
    window.matchMedia = query =>
        ({
            matches: false,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent: () => false,
        }) as MediaQueryList;
}

afterEach(cleanup);
