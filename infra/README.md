# Infrastructure

Infrastructure files live here.

Structure:

```txt
infra/
  docker/   Docker Compose production deploy for a VPS
  railway/  Railway multi-service deploy
  deploy/   Production and staging deployment notes/configuration
```

Initial production shape:

- stateless Laravel API containers
- separate queue worker containers
- PostgreSQL
- Redis
- S3-compatible object storage
- CDN/static hosting for the React app
