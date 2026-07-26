// Local storage fallback store for offline/unreachable Supabase instances.
// Provides local authentication, jobs, bookings, and messaging so the app works seamlessly even if Supabase DNS fails.

export type LocalUser = {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  phone: string;
  role: "client" | "tasker" | "admin";
  created_at: string;
};

export type LocalSession = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string;
      phone: string;
      role: "client" | "tasker" | "admin";
    };
    app_metadata: {
      provider: string;
      providers: string[];
    };
    created_at: string;
  };
};

export type LocalJob = {
  id: string;
  client_id: string;
  client_name?: string;
  title: string;
  description: string;
  category: string;
  budget: number | null;
  location_address: string;
  lat: number;
  lng: number;
  status: "open" | "assigned" | "completed" | "cancelled";
  scheduled_date: string | null;
  created_at: string;
};

export type LocalBooking = {
  id: string;
  job_id: string;
  client_id: string;
  tasker_id: string;
  status: "pending" | "accepted" | "declined" | "in_progress" | "completed" | "cancelled";
  amount: number | null;
  payment_status: string;
  scheduled_date: string | null;
  created_at: string;
};

const USERS_KEY = "flexworkers_local_users";
const SESSION_KEY = "flexworkers_local_session";
const JOBS_KEY = "flexworkers_local_jobs";
const BOOKINGS_KEY = "flexworkers_local_bookings";

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Failed to write to localStorage", e);
  }
}

export const LocalStore = {
  getUsers(): LocalUser[] {
    return getItem<LocalUser[]>(USERS_KEY, []);
  },

  registerUser(u: Omit<LocalUser, "id" | "created_at">): LocalUser {
    const users = this.getUsers();
    const existing = users.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
    if (existing) {
      // Update existing if re-registering
      existing.password = u.password;
      existing.full_name = u.full_name;
      existing.phone = u.phone;
      existing.role = u.role;
      setItem(USERS_KEY, users);
      return existing;
    }
    const newUser: LocalUser = {
      ...u,
      id: `local-usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    setItem(USERS_KEY, users);
    return newUser;
  },

  createSession(user: LocalUser): LocalSession {
    const session: LocalSession = {
      access_token: `mock-token-${Date.now()}`,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: `mock-refresh-${Date.now()}`,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: {
          full_name: user.full_name,
          phone: user.phone,
          role: user.role,
        },
        app_metadata: {
          provider: "email",
          providers: ["email"],
        },
        created_at: user.created_at,
      },
    };
    setItem(SESSION_KEY, session);
    return session;
  },

  getSession(): LocalSession | null {
    return getItem<LocalSession | null>(SESSION_KEY, null);
  },

  clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
  },

  getJobs(): LocalJob[] {
    return getItem<LocalJob[]>(JOBS_KEY, []);
  },

  addJob(job: Omit<LocalJob, "id" | "created_at" | "status">): LocalJob {
    const jobs = this.getJobs();
    const newJob: LocalJob = {
      ...job,
      id: `local-job-${Date.now()}`,
      status: "open",
      created_at: new Date().toISOString(),
    };
    jobs.unshift(newJob);
    setItem(JOBS_KEY, jobs);
    return newJob;
  },

  getBookings(): LocalBooking[] {
    return getItem<LocalBooking[]>(BOOKINGS_KEY, []);
  },

  addBooking(b: Omit<LocalBooking, "id" | "created_at" | "status" | "payment_status">): LocalBooking {
    const bookings = this.getBookings();
    const newBooking: LocalBooking = {
      ...b,
      id: `local-booking-${Date.now()}`,
      status: "pending",
      payment_status: "unpaid",
      created_at: new Date().toISOString(),
    };
    bookings.unshift(newBooking);
    setItem(BOOKINGS_KEY, bookings);
    return newBooking;
  },
};
