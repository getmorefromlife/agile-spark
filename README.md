# Agile Spark

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/getmorefromlife/agile-spark)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployment-black?logo=vercel)](https://agile-spark-main.vercel.app)

A premium, fast, and focused Agile Spark real-time estimation application designed for distributed agile engineering teams. Create estimation rooms, invite team members, manage active user stories, and estimate points collaboratively in real-time.

**Created by Syed Imon Rizvi (MBA, PMP, PSM II, PAL I)**

---

## Features

- **Supabase Authentication**: Secure user registration and login interface.
- **Real-Time Synchronized State**: Real-time room creation, user story edits, estimation votes, card reveals, and session resets across all team participants.
- **Solo/Mock Simulation**: Spawns mock developer participants (Sarah, Dave, Elena) if estimating solo to simulate a full team workflow. Mock players automatically leave when a second real developer joins.
- **Sleek Aesthetic**: A high-end dark slate/blue layout utilizing CSS glassmorphism, glowing cards, and micro-animations.

---

## Technical Stack

- **Core Framework**: [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (React 19, file-based routing)
- **Database & Realtime**: [Supabase](https://supabase.com) (Auth, PostgreSQL DB, and Realtime Broadcast/Replication)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Notifications**: Sonner

---

## Setup & Running Guide

### 1. Database Setup
Register on [Supabase](https://supabase.com) and create a new project. Execute the setup script inside `supabase_setup.sql` in your project's **SQL Editor** to create the tables, security policies, and enable real-time replication:
```bash
# Run the SQL script found in:
supabase_setup.sql
```

### 2. Configure Environment Variables
Create a `.env` file in the root of the project with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Run Development Server
Install dependencies and run the local server:
```bash
# Install packages
npm install

# Launch Vite development environment
npm run dev
```
Open **[http://localhost:8082](http://localhost:8082)** to run and test your Agile Spark application!
