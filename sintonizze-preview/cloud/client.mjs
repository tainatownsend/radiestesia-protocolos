// Dependency-injected Supabase JS client. Not loaded by the local preview.
export class CloudConflict extends Error {
  constructor() { super('Há uma versão mais recente. Recarregue antes de salvar.'); this.name = 'CloudConflict'; }
}
export function validateDocument(document) {
  if (!document || ['protocols', 'sessions', 'templates'].some(k => !Array.isArray(document[k]))) {
    throw new TypeError('Backup inválido. Nenhum dado foi enviado.');
  }
  return JSON.parse(JSON.stringify(document));
}
export function createCloudStore(client) {
  async function userId() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (!data?.user) throw new Error('Entre na sua conta para continuar.');
    return data.user.id;
  }
  return {
    async requestAccess(email) {
      const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
      if (error) throw error;
    },
    async verifyAccess(email, token) {
      const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
      if (error) throw error;
      return data;
    },
    async load() {
      const owner = await userId();
      const { data: member, error: memberError } = await client.from('sintonizze_members').select('user_id').eq('user_id', owner).maybeSingle();
      if (memberError) throw memberError;
      if (!member) throw new Error('Esta conta ainda não tem acesso ao Sintonizze.');
      const { data, error } = await client.from('sintonizze_snapshots').select('*').eq('owner_id', owner).order('revision', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data ? { revision: data.revision, document: validateDocument(data.payload) } : { revision: 0, document: null };
    },
    async save(document, expectedRevision) {
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError('Revisão inválida.');
      const snapshot = validateDocument(document);
      await userId();
      const { data, error } = await client.rpc('sintonizze_save_snapshot', { expected_revision: expectedRevision, document: snapshot });
      if (error?.code === '40001') throw new CloudConflict();
      if (error) throw error;
      if (!data?.[0]) throw new Error('O servidor não confirmou o salvamento.');
      return { revision: data[0].revision, document: validateDocument(data[0].payload) };
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }
  };
}
