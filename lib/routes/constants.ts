const Colors = {
    None: "\x1b[0m",
    Underscore: "\x1b[4m",
    Black: "\x1b[30m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    White: "\x1b[37m",
};

export const SuccessPrefix = `${Colors.Black}[${Colors.Green}${Colors.Underscore}Routes${Colors.Black}]${Colors.None} `;
export const ErrorPrefix = `${Colors.Black}[${Colors.Red}${Colors.Underscore}Routes${Colors.Black}]${Colors.None} `;

export { Colors };
