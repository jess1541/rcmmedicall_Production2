# Etapa 1: Construcción (Build)
FROM node:20-alpine AS builder

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa 2: Ejecución (Runtime)
FROM node:20-alpine AS runner

WORKDIR /app

# Copiamos solo lo necesario desde la etapa de construcción
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist 
# Nota: Cambia './dist' por la carpeta de salida de tu build (ej. './build' o '.next')

# Exponer el puerto
EXPOSE 8080
COPY --from=builder /app/server.js ./server.js
# Comando para iniciar la aplicación
CMD ["npm", "start"]
