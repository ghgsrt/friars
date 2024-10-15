export type Request<B extends {}, R extends {}> = Partial<Omit<B, keyof R>> & R;
