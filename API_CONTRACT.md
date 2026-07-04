# Backend API Contract for Admin Dashboard

This document describes the exact contract the frontend admin dashboard expects from the backend.

## Base URL

- Local dev: `http://localhost:5000/api`
- Production: `https://backend-lumii-plm7dk0yz-davids-projects-b37cdfcb.vercel.app/api`

## Auth

### POST /api/admin/login

Request body:
```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```

Success response:
```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "refreshToken": "<token>",
    "user": {
      "id": "u1",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

Errors:
- `400` validation
- `401` invalid credentials

### POST /api/admin/refresh

Request body:
```json
{
  "refreshToken": "<token>"
}
```

Success response:
```json
{
  "success": true,
  "data": {
    "accessToken": "<new JWT>",
    "refreshToken": "<new refresh token>"
  }
}
```

Errors:
- `400` validation
- `401` invalid refresh token

## Products

All product routes require `Authorization: Bearer <accessToken>`.

### GET /api/products

Query parameters:
- `page` (number)
- `limit` (number)
- `q` (search text)
- `category`
- `active` (`true` or `false`)
- `sort` (`price:asc` or `price:desc`)

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "p_abc123",
        "name": "LPC 403.B",
        "sku": "LPC-403B",
        "description": "...",
        "price": 18500,
        "currency": "NGN",
        "images": ["/uploads/abc.jpg"],
        "category": "Necklaces",
        "inventory": { "stock": 12 },
        "tags": ["gold"],
        "active": true,
        "createdAt": "2026-06-09T12:00:00Z",
        "updatedAt": "2026-06-09T12:00:00Z"
      }
    ],
    "total": 123,
    "page": 1,
    "limit": 24
  }
}
```

### GET /api/products/:id

Response:
```json
{
  "success": true,
  "data": {
    "id": "p_abc123",
    "name": "LPC 403.B",
    ...
  }
}
```

### POST /api/products

Request body:
```json
{
  "name": "LPC 403.B",
  "sku": "LPC-403B",
  "description": "...",
  "price": 18500,
  "currency": "NGN",
  "images": ["/uploads/1.jpg"],
  "category": "Necklaces",
  "inventory": { "stock": 12 },
  "tags": ["gold","new"],
  "active": true
}
```

Success response:
```json
{
  "success": true,
  "data": { /* created product object */ }
}
```

Validation errors:
```json
{
  "success": false,
  "errors": {
    "name": "required",
    "price": "must be >= 0",
    "category": "required"
  }
}
```

### PUT /api/products/:id
### PATCH /api/products/:id

Request body: any fields from product payload.

Success response:
```json
{
  "success": true,
  "data": { /* updated product object */ }
}
```

### DELETE /api/products/:id

Success response:
```json
{
  "success": true
}
```

## Uploads

### POST /api/uploads

- `multipart/form-data`
- field: `file`

Success response:
```json
{
  "success": true,
  "data": {
    "url": "/uploads/<filename>.jpg"
  }
}
```

## Error payload

All error responses should follow this shape:
```json
{
  "success": false,
  "message": "...",
  "errors": {
    "field": "message"
  }
}
```

## Auth header

All protected routes require:
```http
Authorization: Bearer <accessToken>
```

## Notes for frontend

- Use `axios` with base URL `/api`.
- Store `accessToken` securely.
- Send `Authorization` header on all protected product/upload requests.
- Refresh tokens should be rotated by the backend on `/api/admin/refresh`.
- The frontend expects `/api/products` to return `data.items`.
