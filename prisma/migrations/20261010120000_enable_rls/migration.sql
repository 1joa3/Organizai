-- O Supabase expõe o schema "public" via API REST (PostgREST) para as roles
-- anon/authenticated. Este app acessa o banco só pelo Prisma (role postgres,
-- dona das tabelas, que ignora RLS), então habilitar RLS sem nenhuma policy
-- bloqueia todo acesso pela API pública sem afetar o app.

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Investment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
