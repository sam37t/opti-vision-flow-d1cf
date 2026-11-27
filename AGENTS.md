# Architecture rules

- Load the dossier distribution view lazily and derive its aggregates from the filtered dossier list; this keeps the default Kanban lightweight and avoids duplicate data requests.
- Use the shared dossier-priority comparator for filtered results: quote and unpaid transmission delays use their stage dates, other statuses use the last status change; display one matching delay counter across list and Kanban to avoid contradictory ages.
