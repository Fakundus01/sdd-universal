# diagram.md · Turnos

**Versión:** 0.3.0 · Diagramas en Mermaid: se versionan como texto y se diffean en el PR, a diferencia de una captura.

## Arquitectura

```mermaid
flowchart TB
    subgraph cliente["Navegador"]
        pub["Web pública<br/>/ (reservar)"]
        adm["Panel admin<br/>/admin"]
    end

    subgraph vercel["Vercel"]
        static["Estáticos<br/>React + Vite"]
        api["API Fastify<br/>/api/v1"]
    end

    subgraph servicios["Servicios"]
        neon[("Neon<br/>Postgres")]
        resend["Resend<br/>magic links"]
    end

    pub --> static
    adm --> static
    static -->|fetch| api
    api -->|SQL parametrizado| neon
    api -->|email| resend

    neon -.->|"EXCLUDE sin_solape:<br/>acá vive la garantía de O1"| neon
```

## Flujo de reserva (el camino crítico)

```mermaid
sequenceDiagram
    autonumber
    actor C as Clienta
    participant F as Front
    participant A as API
    participant D as Postgres

    C->>F: elige servicio y día
    F->>A: GET /disponibilidad?fecha&servicioId
    A->>D: turnos del día, no cancelados
    D-->>A: turnos ocupados
    A-->>F: slots libres
    F-->>C: muestra horarios

    Note over C,F: acá pueden pasar minutos:<br/>otra clienta puede tomar el slot

    C->>F: elige 15:00 y confirma
    F->>A: POST /turnos
    A->>D: INSERT (peluquera libre)

    alt slot todavía libre
        D-->>A: OK
        A-->>F: 201 turno creado
        F-->>C: "Listo, te esperamos"
    else slot tomado en el medio
        D-->>A: viola sin_solape
        A-->>F: 409 HORARIO_OCUPADO
        F->>A: GET /disponibilidad (recarga)
        F-->>C: "Ese horario se acaba de ocupar"
    end
```

La rama del `else` es el motivo por el que el diagrama existe: es el caso que se olvida al diseñar y el que más se ve en producción.

## Estados de un turno

```mermaid
stateDiagram-v2
    [*] --> reservado: POST /turnos
    reservado --> vino: la clienta llegó
    reservado --> no_vino: no apareció
    reservado --> cancelado: avisó antes
    vino --> [*]
    no_vino --> [*]
    cancelado --> [*]
```

No hay transición hacia atrás y **no hay `DELETE`**: `no_vino` es el dato que alimenta O3, y un turno borrado es un dato perdido para siempre.
