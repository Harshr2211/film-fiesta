# Architecture Diagrams — docs/diagrams

This folder contains the PlantUML sources, generated SVGs, and Mermaid sources for the Film-Fiesta project architecture. The README embeds the SVG images (so you can open them directly) and also inlines Mermaid blocks (GitHub/VS Code can render these).

---

## Component Diagram

![Component Diagram](./component_diagram.svg)

### Mermaid source

```mermaid
%% Mermaid component diagram for Film-Fiesta
flowchart LR
  subgraph Client [Client (React)]
    App[App]
    Header[Header]
    Footer[Footer]
    LoginModal[LoginModal]
    ToastStack[ToastStack]
    AppRoutes[AppRoutes]
    HomePage[Home / Popular / TopRated / MoviesList / Search / MovieDetail / PersonDetail / Recommendation / Profile]
    App --> Header
    App --> Footer
    App --> LoginModal
    App --> ToastStack
    App --> AppRoutes
    AppRoutes --> HomePage
    HomePage --> MovieCard[MovieCard]
    MoviesListPage[MoviesListPage] --> MovieCard
    MoviesDetailPage[MoviesDetailPage] --> MovieCard
    SearchPage[SearchPage] --> MovieCard
    Header --> LoginModal
    Header --> SearchPage
  end

  subgraph External [API / Server]
    TMDB[TMDB API]
    ServerAPI[Server: Auth / Comments / Ratings]
  end

  MoviesDetailPage -->|fetch details / credits / images| TMDB
  MoviesDetailPage -->|GET/POST comments| ServerAPI
  MoviesDetailPage -->|GET/POST ratings| ServerAPI
  ProfilePage --> ServerAPI

  classDef pkg fill:#fff6e6,stroke:#d9a500
  class Client pkg
  class External pkg
```

---

## Server Models (Class Diagram)

![Server Class Diagram](./server_class_diagram.svg)

### Mermaid source

```mermaid
%% Mermaid class diagram (server models - mongoose)
classDiagram
  class User {
    +ObjectId _id
    +String username
    +String email
    +String passwordHash
    +Date createdAt
  }

  class Comment {
    +ObjectId _id
    +ObjectId user
    +String movieId
    +String text
    +Date createdAt
  }

  class Rating {
    +ObjectId _id
    +ObjectId user
    +String movieId
    +Number rating
    +Date createdAt
  }

  Comment --> User : user (ref)
  Rating --> User : user (ref)
```

---

## Sequence: Movie Detail Flow

![Sequence Diagram](./sequence_movie_detail.svg)

### Mermaid source

```mermaid
%% Mermaid sequence diagram for movie detail flow
sequenceDiagram
  participant U as User
  participant B as Browser
  participant P as MoviesDetailPage
  participant T as TMDB_API
  participant C as Comments_API
  participant R as Ratings_API

  U->>B: click movie card
  B->>P: navigate /movies/:id (render)
  P->>T: GET /movie/:id (details)
  T-->>P: 200 OK (movie details)
  P->>T: GET /movie/:id/credits
  T-->>P: 200 OK (credits)
  P->>C: GET /comments?movieId=:id
  C-->>P: 200 OK (comments[])
  P->>R: GET /ratings?movieId=:id
  R-->>P: 200 OK (ratings summary)
  P-->>B: render movie details + cast + comments + rating UI

  note over U,B: user posts comment
  U->>B: submit comment
  B->>P: POST /comments {movieId, text}
  P->>C: POST /comments {movieId, text, user}
  C-->>P: 201 Created (comment)
  P-->>B: append comment to UI

  note over U,B: user rates
  U->>B: submit rating
  B->>P: POST /ratings {movieId, rating}
  P->>R: POST /ratings {movieId, rating, user}
  R-->>P: 201 Created (rating)
  P-->>B: update rating UI
```

---

## Sources included
- PlantUML sources: `component_diagram.puml`, `server_class_diagram.puml`, `sequence_movie_detail.puml`
- Generated SVGs: `component_diagram.svg`, `server_class_diagram.svg`, `sequence_movie_detail.svg`
- Mermaid sources: `component_diagram.mmd`, `server_class_diagram.mmd`, `sequence_movie_detail.mmd`

## Notes
- GitHub renders Mermaid blocks when included in Markdown; the `.mmd` files are provided for convenience and can be opened with a Mermaid previewer in VS Code.
- If you'd like PNG versions or separate standalone Markdown pages for each diagram, I can add those as well.
