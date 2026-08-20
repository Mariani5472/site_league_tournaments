export const up = (pgm) => {
  pgm.addColumn("leagues", {
    banner_url: { type: "text" },
  });
};

export const down = (pgm) => {
  pgm.dropColumn("leagues", "banner_url");
};
