# Infrastructure

Infrastructure files will live here.

Planned structure:

```txt
infra/
  docker/   Local development services
  deploy/   Production and staging deployment notes/configuration
```

Initial production shape:

- stateless Laravel API containers
- separate queue worker containers
- PostgreSQL
- Redis
- S3-compatible object storage
- CDN/static hosting for the React app
