FROM node:20-alpine

WORKDIR /app
COPY . .

RUN apk add --no-cache python3 py3-pip
RUN npm install --legacy-peer-deps
RUN npm run build
RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 3105 8001

CMD ["sh", "-c", "python3 cyrus-ai/api.py & npm start"]
