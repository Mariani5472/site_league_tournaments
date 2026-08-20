import { z } from "zod";

export const imageUrlSchema = z
    .url()
    .max(2048)
    .refine(value => {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
    }, "Image URL must use HTTP or HTTPS");
