# analog

## Get started

Prepare your environment variables by copying the `.env.dev` file and start the PostgreSQL database using Docker Compose:

```bash
copy .env.dev .env

docker compose up -d
```

To additionally start the Cap CAPTCHA server (and its Valkey backend) alongside PostgreSQL, pass both compose files with `-f`:

```bash
docker compose -f compose.yml -f compose.cap.yml up -d
```

The Cap server will be available at [localhost:3001](http://localhost:3001).

Start the demo application and visit [localhost:5174](http://localhost:5174) in your browser:

```bash
pnpm start
```

## Better Auth

Run the following command to update prisma schema base on the Better Auth configuration:

```bash
pnpm dlx auth@latest generate --config src/server/utils/auth.ts
```
