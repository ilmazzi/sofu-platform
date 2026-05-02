# Backend Modules

Sofu uses a modular monolith. Each module owns a business capability and keeps domain rules close to the use cases that enforce them.

Module layout:

```txt
ModuleName/
  Domain/          Entities, value objects, domain services, domain events
  Application/     Use cases, commands, query handlers, DTOs
  Infrastructure/  Eloquent models, repositories, migrations, external adapters
  Http/            Controllers, form requests, resources, route file
```

Controllers should stay thin. They validate input, call an application action, and return an API resource.

Use shared code only when it is genuinely cross-domain. Prefer duplication inside a module over premature shared abstractions.
