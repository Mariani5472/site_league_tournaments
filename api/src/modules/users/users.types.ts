/**
 * Representa a entidade completa de um usuário no sistema.
 * Contém todos os dados cadastrais e de perfil.
 */
export type User = {
  /** Identificador único universal (UUID v4) */
  id: string;
  /** Endereço de e-mail principal e verificado do usuário */
  email: string;
  /** Nome de exibição público e único na plataforma */
  nickname: string;
  /** URL da imagem de perfil hospedada no S3 */
  avatar_url: string;
  /** URL da imagem de capa do perfil */
  banner_url: string;
  /** Breve descrição biográfica escrita pelo usuário */
  bio: string;
  /** Data e hora em que a conta foi criada no banco de dados */
  created_at: Date;
}

/**
 * Contrato público minimalista contendo apenas os dados essenciais de identificação.
 */
export type UserIdentity = Pick<User, 'id' | 'email'>;

/**
 * Dados necessários para a criação de um novo usuário no sistema.
 */
export type CreateUserDTO = Pick<User, 'id' | 'email' | 'nickname'>;