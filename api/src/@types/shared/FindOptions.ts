import { QueryOptions } from "./QueryOptions";
export type FindOptions = QueryOptions & {
    lock?: "update";
};
