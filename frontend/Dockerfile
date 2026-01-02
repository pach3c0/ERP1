# Ambiente de desenvolvimento
FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json* ./

# Instala as dependências
RUN npm install

# Copia o resto do projeto
COPY . .

# Expõe a porta padrão do Vite
EXPOSE 5173

# Roda em modo desenvolvimento (com hot-reload)
CMD ["npm", "run", "dev", "--", "--host"]