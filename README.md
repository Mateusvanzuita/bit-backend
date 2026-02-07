# Backend API - React Native App

Backend completo com Node.js, Express, Prisma e PostgreSQL.

## 🚀 Setup Rápido

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar ambiente
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

### 3. Setup do banco de dados
```bash
npx prisma migrate dev --name init
npm run prisma:generate
npm run prisma:seed
```

### 4. Iniciar servidor
```bash
npm run dev
```

## 📡 Endpoints

Base URL: `http://localhost:3000/api/v1`

### Auth
- `POST /auth/register` - Registrar
- `POST /auth/login` - Login
- `GET /auth/profile` - Perfil (protegido)

### Posts
- `POST /posts` - Criar post (protegido)
- `GET /posts` - Listar posts (protegido)
- `GET /posts/:id` - Buscar post (protegido)
- `PUT /posts/:id` - Atualizar post (protegido)
- `DELETE /posts/:id` - Deletar post (protegido)
- `GET /posts/my-posts` - Meus posts (protegido)

## 📱 React Native Integration

```javascript
const api = axios.create({
  baseURL: 'http://SEU-IP:3000/api/v1',
});

// Login
const { data } = await api.post('/auth/login', { email, password });
const token = data.data.token;

// Requisições autenticadas
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

## 🔐 Credenciais de Teste
- Email: user@example.com
- Senha: 123456
