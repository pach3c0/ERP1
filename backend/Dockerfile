# Imagem base leve
FROM python:3.11-slim

# Diretório de trabalho
WORKDIR /app

# Instala dependências do sistema (necessário para alguns drivers de DB)
RUN apt-get update && apt-get install -y build-essential libpq-dev

# Copia e instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código fonte
COPY . .

# Expõe a porta
EXPOSE 8000

# Comando de inicialização
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]