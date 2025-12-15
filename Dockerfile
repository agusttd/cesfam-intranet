# Usamos una imagen de Node ligera
FROM node:20-alpine

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias necesarias para Prisma en Alpine Linux
RUN apk add --no-cache libc6-compat openssl

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Copiar la carpeta de Prisma (VITAL para que funcione el postinstall)
COPY prisma ./prisma/

# Instalar dependencias (usamos npm ci para instalación limpia)
RUN npm ci

# Copiar el resto del código
COPY . .

# Construir la aplicación Next.js
# Desactivamos el linting aquí también para asegurar que construya
ENV NEXT_LINT=false
RUN npm run build

# Exponer el puerto 8080 (El que usa Railway)
EXPOSE 8080

# COMANDO FINAL: Usamos npm start para asegurar que ejecute tu script
# Tu script en package.json ya tiene "-p $PORT -H 0.0.0.0", así que esto funcionará perfecto.
CMD ["npm", "start"]