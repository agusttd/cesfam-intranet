FROM node:20-alpine

WORKDIR /app

# 1. Instalar dependencias del sistema necesarias para Prisma/Next
RUN apk add --no-cache libc6-compat openssl

# 2. Copiar archivos de configuración de dependencias
COPY package.json package-lock.json ./
# Copiar la carpeta prisma antes de instalar para que 'prisma generate' funcione
COPY prisma ./prisma/

# 3. Instalar TODAS las dependencias (necesarias para el build)
RUN npm ci

# 4. Copiar el resto del código fuente
COPY . .

# 5. Construir la aplicación
ENV NEXT_TELEMETRY_DISABLED 1
# Por seguridad, desactivamos el linting aquí también
ENV NEXT_LINT=false
RUN npm run build

# 6. Mover archivos estáticos al lugar correcto (Vital para modo standalone)
# Esto arregla que las imágenes o estilos no carguen
RUN cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static

# 7. Configurar variables de entorno para producción
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"
ENV NODE_ENV production

# 8. Exponer el puerto
EXPOSE 8080

# 9. Comando de arranque BLINDADO
CMD ["node", ".next/standalone/server.js"]