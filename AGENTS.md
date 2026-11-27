# Architecture rules

- Load the dossier distribution view lazily and derive its aggregates from the filtered dossier list; this keeps the default Kanban lightweight and avoids duplicate data requests.
- Keep AI delay analysis in an authenticated manager-only server function and send only aggregated statistics to the model; this protects client identities and prevents unauthorized credit usage or dossier changes.