iniciando criação do backend: 
`mkdir api`
`cd api`
comando de docker simples:
`docker run -it --rm -v .:/app --workdir /app node:20.10 /bin/bash`
iniciar node:
`npm init -y`
dowload de dependencias:
`npm i express cors helmet dotenv pg zod pino pino-http`
`npm i -D typescript tsx @types/node @types/express`
criar tsconfig:
`npx tsc --init`
config básica:
`
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true
  },
  "include": ["src"]
}
`
criando a estrutura simples do backend:
`mkdir src`
`mkdir src/database`
`mkdir src/routes`
`mkdir src/config`
criando src/server.ts
