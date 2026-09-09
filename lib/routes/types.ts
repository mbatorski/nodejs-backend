export type RequestMethod = "post" | "get" | "options" | "delete" | "put" | "patch";

export type RouteSettings = {
    type?: "string" | "number" | "json" | "array" | "boolean" | "any" | "anystring";
    length?: number;
    maxLength?: number;
    minLength?: number;
    maxValue?: number;
    minValue?: number;
    onlyLatinCharacters?: boolean;
    onlyLatinCharactersAndNumbers?: boolean;
    optional?: boolean;
    nullable?: boolean;
    range?: any[];
};

export type JsonWebTokenOptions = {
    verify?: boolean;
    getData?: boolean;
};

export type MultipartFieldOptions = {
    minLength?: number;
    maxLength?: number;
    length?: number;
};
