# S3 Explorer (whitelabel)

A small internal web app to explore an S3 bucket: browse folders, upload,
download, rename and delete objects. It has a list view and a gallery view
(1:1 thumbnails with image preview), sorting (name/date/size) and pagination
("Load more" over S3 continuation tokens). Images without a file extension are
detected by sniffing their magic bytes (`GET /api/objects/sniff`, a 512-byte
range request), so they preview correctly too. The UI is 100% client-side;
all S3 operations go through Next.js API route handlers, so credentials never
leave the server.

No built-in auth: it is meant to run behind an internal network / VPN.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui (base-nova) + lucide-react
- @tanstack/react-query
- AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`)

## Configuration

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Required | Description |
| --- | --- | --- |
| `S3_REGION` | yes | AWS region of the bucket |
| `S3_BUCKET` | yes | Bucket to explore |
| `S3_ACCESS_KEY_ID` | yes | IAM access key |
| `S3_SECRET_ACCESS_KEY` | yes | IAM secret key |
| `S3_ENDPOINT` | no | Custom endpoint for S3-compatible providers (MinIO, R2, Spaces...) |
| `S3_FORCE_PATH_STYLE` | no | `true`/`false`. Defaults to `true` when `S3_ENDPOINT` is set |
| `S3_ROOT_PREFIX` | no | Restrict browsing to a prefix, e.g. `team/docs/` |
| `CDN_BASE_URL` | no | Public CDN base URL in front of the bucket. Enables a "Copy URL" action on files |
| `BRAND_TITLE` | no | App title (header + browser tab). Default: `S3 Explorer` |
| `BRAND_LOGO_URL` | no | Logo URL: path in `public/` (e.g. `/logo.svg`) or absolute URL |
| `BRAND_ACCENT_COLOR` | no | Hex color, e.g. `#4f46e5`. Applied to the primary theme color |

Branding is applied **at runtime** via `GET /api/config`: the same build can
serve different brands by changing env vars, no rebuild needed.

## IAM permissions

The IAM identity needs:

```json
{
  "Effect": "Allow",
  "Action": ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
  "Resource": ["arn:aws:s3:::YOUR_BUCKET", "arn:aws:s3:::YOUR_BUCKET/*"]
}
```

Notes:

- **Delete** is optional: without `s3:DeleteObject`, deletes (and renames,
  since rename = copy + delete) fail with a clear "denied by IAM policy"
  message in the UI.
- If `S3_ROOT_PREFIX` is set, the IAM policy can be scoped to that prefix.

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Production

```bash
pnpm build
pnpm start
```

## Docker

```bash
cp .env.example .env   # fill in your values
docker compose up --build
```

Or without compose:

```bash
docker build -t s3-explorer .
docker run --env-file .env -p 3000:3000 s3-explorer
```

Branding (`BRAND_*`) and S3 credentials are runtime env vars, so the same
image works for every brand/environment — pass different env vars per
container, no rebuild needed.

## PWA

The app ships a web manifest (`app/manifest.ts`, dynamic: the PWA name and
theme color follow `BRAND_TITLE` / `BRAND_ACCENT_COLOR`) and a dummy
service worker (`public/sw.js`, no caching), so Chrome shows the install
option. Icons are placeholders in `public/icons/` — replace them with your
brand's icons (192, 512 and 512-maskable).
