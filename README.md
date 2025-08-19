# Starter Kit 2.0

A modern, full-stack Next.js application with Supabase authentication, user management, and role-based access control.

## 🚀 Features

- **🔐 Authentication**: Complete auth system with Supabase (login, signup, email confirmation, password reset)
- **👥 User Management**: User profiles, roles, and permissions
- **🛡️ Security**: CSRF protection, rate limiting, session management
- **📊 Dashboard**: Admin dashboard with user statistics
- **⚙️ Settings**: Comprehensive settings management
- **📱 WhatsApp Integration**: Connect and manage WhatsApp messaging
- **🎨 Modern UI**: Beautiful, responsive design with Tailwind CSS and Radix UI
- **🔄 GraphQL**: Built-in GraphQL API with type safety
- **📝 Error Handling**: Comprehensive error logging and user feedback

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SSR
- **Styling**: Tailwind CSS + Radix UI
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Context
- **TypeScript**: Full type safety
- **Security**: CSRF protection, rate limiting

## 📋 Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account and project

## 🚀 Quick Start

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd starter-kit-2.0
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials and other required variables (see [Environment Variables](#environment-variables) section)

4. **Set up Supabase**

   ```bash
   # Initialize Supabase (if not already done)
   npm run supabase:init

   # Link to your project
   npm run supabase:link

   # Run migrations
   npm run db:migrate
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Environment Variables

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Security
CSRF_SECRET=your-strong-random-secret
```

### Optional Variables

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Starter Kit 2.0

# WhatsApp Integration
ULTRAMSG_INSTANCE_ID=your_instance_id
ULTRAMSG_TOKEN=your_token

# Development
NEXT_PUBLIC_SUPABASE_DEBUG=false
API_LOGGING=true
```

See `.env.example` for the complete list and descriptions.

## 📊 Database Setup

The project includes comprehensive database migrations. Use these commands:

```bash
# Validate migrations before running
npm run db:validate

# Run migrations safely
npm run db:safe-migrate

# Check migration status
npm run db:status

# Reset database (development only)
npm run db:reset
```

## 🔐 Authentication Setup

This project uses Supabase Auth with proper SSR implementation:

1. **Email/Password authentication**
2. **Email confirmation required**
3. **Password reset functionality**
4. **Session management with automatic refresh**
5. **Role-based access control**

### Setting up Supabase Auth:

1. In your Supabase dashboard, go to Authentication → Settings
2. Configure your site URL: `http://localhost:3000` (development) or your production URL
3. Set up email templates (optional)
4. Enable email confirmations

## 📱 WhatsApp Integration

Connect your WhatsApp account for messaging:

1. Sign up for [UltraMsg](https://ultramsg.com/)
2. Get your Instance ID and Token
3. Add them to your `.env.local`
4. Go to Settings → WhatsApp in the app
5. Scan the QR code with WhatsApp

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

1. Build the application:

   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

### Production Checklist

- [ ] Set strong `CSRF_SECRET`
- [ ] Configure production Supabase URL and keys
- [ ] Set up proper domain in Supabase Auth settings
- [ ] Enable RLS policies in Supabase
- [ ] Configure external logging (optional)
- [ ] Set up monitoring and error tracking

## 📁 Project Structure

```
starter-kit-2.0/
├── app/                    # Next.js App Router
│   ├── (main)/            # Main application routes
│   ├── auth/              # Authentication pages
│   └── api/               # API routes
├── components/            # Reusable components
│   ├── auth/              # Authentication components
│   ├── ui/                # UI components (Radix UI)
│   └── main-layout/       # Layout components
├── lib/                   # Utility libraries
│   ├── supabase/          # Supabase client configuration
│   ├── auth/              # Authentication utilities
│   └── services/          # Business logic services
├── modules/               # Feature modules (users, roles, settings)
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── supabase/             # Database migrations and config
```

## 🔧 Available Scripts

```bash
# Development
npm run dev                # Start development server
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Run ESLint

# Database
npm run db:migrate        # Run database migrations
npm run db:reset          # Reset database (dev only)
npm run db:validate       # Validate migrations
npm run db:safe-migrate   # Validate then migrate

# Supabase
npm run supabase:init     # Initialize Supabase
npm run supabase:link     # Link to Supabase project
```

## 📚 Documentation

- [Authentication Setup](./docs/authentication-setup.md)
- [WhatsApp Integration](./docs/whatsapp-integration.md)
- [Demo Usage](./scripts/demo-usage.md)

## 🛠️ Development

### Adding New Features

1. Create components in `components/`
2. Add services in `lib/services/`
3. Create API routes in `app/api/`
4. Add database migrations in `supabase/migrations/`

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- React Hook Form for forms
- Zod for validation

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid API key"** - Check your Supabase environment variables
2. **Redirect loops** - Ensure auth pages are excluded in middleware
3. **Session not persisting** - Verify middleware returns supabaseResponse
4. **CSRF errors** - Set a strong CSRF_SECRET

### Getting Help

1. Check the console for error messages
2. Enable debug logging: `NEXT_PUBLIC_SUPABASE_DEBUG=true`
3. Review the [documentation](./docs/)

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Happy coding! 🎉**
