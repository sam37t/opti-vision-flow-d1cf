# Architecture rules

- Load the dossier distribution view lazily and derive its aggregates from the filtered dossier list; this keeps the default Kanban lightweight and avoids duplicate data requests.
- Use the shared dossier-priority comparator and day counter for filtered dossier results and their badges; sorting and displayed age must agree across list and Kanban.
