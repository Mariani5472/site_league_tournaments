export const up = (pgm) => {
  pgm.addColumn("leagues", {
    avatar_url: { type: "text" },
  });
};

export const down = (pgm) => {
  pgm.dropColumn("leagues", "avatar_url");
};
