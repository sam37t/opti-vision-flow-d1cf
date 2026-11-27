# Architecture rules

- Load the dossier distribution view lazily and derive its aggregates from the filtered dossier list; this keeps the default Kanban lightweight and avoids duplicate data requests.
