-- Datas de calendário passam a ser guardadas ao meio-dia UTC. À meia-noite
-- UTC (como o formulário salvava) elas apareciam como o dia anterior no
-- Brasil. Tudo que já existe tem o dia certo pela data UTC (formulário:
-- 00:00 UTC; importação/seed: 03:00 UTC), então basta mover para o
-- meio-dia do mesmo dia.
UPDATE "Transaction" SET "date" = date_trunc('day', "date") + INTERVAL '12 hours';
UPDATE "Investment" SET "date" = date_trunc('day', "date") + INTERVAL '12 hours';
UPDATE "Goal" SET "deadline" = date_trunc('day', "deadline") + INTERVAL '12 hours' WHERE "deadline" IS NOT NULL;
