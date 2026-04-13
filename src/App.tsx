import { FormEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { allPermissions, initialState } from "./data";
import { fetchRemoteState, isRemoteConfigured, saveRemoteState } from "./remoteState";
import {
  AppState,
  Guest,
  HousekeepingItem,
  InventoryItem,
  Permission,
  Room,
  ServiceItem,
  StaffMember,
  User,
} from "./types";

const STORAGE_KEY = "lms-state";
const THEME_KEY = "lms-theme";
const SESSION_KEY = "lms-session";

type Theme = "white" | "black";

type NavItem = {
  key: Permission;
  label: string;
  description: string;
};

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", description: "Live lodge overview" },
  { key: "guests", label: "Guests", description: "Check-in and check-out" },
  { key: "rooms", label: "Rooms", description: "Availability and allotment" },
  { key: "services", label: "Services", description: "Breakfast and tea" },
  { key: "staff", label: "Staff", description: "Attendance and shifts" },
  { key: "expenses", label: "Expenses", description: "Daily cost tracking" },
  {
    key: "housekeeping",
    label: "Housekeeping",
    description: "Cleaning and laundry",
  },
  { key: "billing", label: "Billing", description: "Invoices and payments" },
  { key: "accounting", label: "Accounting", description: "P&L and analysis" },
  { key: "inventory", label: "Inventory", description: "Stock and alerts" },
  { key: "analytics", label: "Analytics", description: "Charts and trends" },
  { key: "safety", label: "Safety", description: "Emergency readiness" },
  { key: "users", label: "Users", description: "Admin access control" },
];

function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }

  try {
    return JSON.parse(raw) as AppState;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }
}

function loadTheme(): Theme {
  const storedTheme = localStorage.getItem(THEME_KEY);

  if (storedTheme === "black" || storedTheme === "dark") {
    return "black";
  }

  return "white";
}

function loadSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function saveState(next: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function StatCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <article className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [state, setState] = useState<AppState>(loadState);
  const [sessionUsername, setSessionUsername] = useState<string | null>(
    loadSession,
  );
  const [loginError, setLoginError] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [roomMessage, setRoomMessage] = useState("");
  const [serviceMessage, setServiceMessage] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [housekeepingMessage, setHousekeepingMessage] = useState("");
  const [inventoryMessage, setInventoryMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState(
    isRemoteConfigured() ? "Supabase sync enabled" : "Local storage mode",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    if (!isRemoteConfigured()) {
      return () => {
        active = false;
      };
    }

    void fetchRemoteState()
      .then((remoteState) => {
        if (!active) {
          return;
        }

        if (!remoteState) {
          void saveRemoteState(state)
            .then(() => {
              if (!active) {
                return;
              }

              setSyncStatus("Supabase sync enabled");
            })
            .catch(() => {
              if (!active) {
                return;
              }

              setSyncStatus("Local fallback mode");
            });
          return;
        }

        setState(remoteState);
        saveState(remoteState);
        setSyncStatus("Supabase sync enabled");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setSyncStatus("Local fallback mode");
      });

    return () => {
      active = false;
    };
  }, []);

  const currentUser = useMemo(
    () => state.users.find((user) => user.username === sessionUsername) ?? null,
    [sessionUsername, state.users],
  );

  const allowedPermissions = currentUser?.permissions ?? [];

  const updateState = (next: AppState) => {
    setState(next);
    saveState(next);

    if (!isRemoteConfigured()) {
      return;
    }

    void saveRemoteState(next)
      .then(() => {
        setSyncStatus("Supabase sync enabled");
      })
      .catch(() => {
        setSyncStatus("Local fallback mode");
      });
  };

  const toggleTheme = () => {
    setTheme((previous) => (previous === "white" ? "black" : "white"));
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const matchedUser = state.users.find(
      (user) => user.username === username && user.password === password,
    );

    if (!matchedUser) {
      setLoginError("Invalid credentials. Use the configured admin account.");
      return;
    }

    localStorage.setItem(SESSION_KEY, matchedUser.username);
    setSessionUsername(matchedUser.username);
    setLoginError("");
    event.currentTarget.reset();
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionUsername(null);
  };

  const addGuest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const roomPreference = String(formData.get("roomPreference"));
    const suggestion = suggestRoom(state.rooms, roomPreference);
    const phone = String(formData.get("phone"));
    const returning = state.guests.some((guest) => guest.phone === phone);
    const guest: Guest = {
      id: `g-${Date.now()}`,
      name: String(formData.get("name")),
      phone,
      idProof: String(formData.get("idProof")),
      roomPreference,
      serviceTiming: String(formData.get("serviceTiming")),
      returning,
      emergencyContact: String(formData.get("emergencyContact")),
      status: suggestion ? "reserved" : "checked-in",
      roomId: suggestion?.id,
    };

    const nextRooms = state.rooms.map((room) =>
      room.id === suggestion?.id ? { ...room, status: "reserved" as const } : room,
    );

    updateState({
      ...state,
      guests: [guest, ...state.guests],
      rooms: nextRooms,
    });
    setGuestMessage(
      suggestion
        ? `Room ${suggestion.number} reserved for ${guest.name}.`
        : `${guest.name} added without room allocation. No matching vacant room was available.`,
    );
    event.currentTarget.reset();
  };

  const addRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const number = String(formData.get("number")).trim();

    if (state.rooms.some((room) => room.number === number)) {
      setRoomMessage(`Room ${number} already exists.`);
      return;
    }

    const room: Room = {
      id: `R-${number}`,
      number,
      type: String(formData.get("type")),
      price: Number(formData.get("price")),
      status: String(formData.get("status")) as Room["status"],
      lastGuest: String(formData.get("lastGuest")).trim() || "N/A",
    };

    updateState({
      ...state,
      rooms: [room, ...state.rooms],
    });
    setRoomMessage(`Room ${room.number} added successfully.`);
    event.currentTarget.reset();
  };

  const addService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const service: ServiceItem = {
      day: String(formData.get("day")),
      breakfast: String(formData.get("breakfast")),
      tea: String(formData.get("tea")),
      timing: String(formData.get("timing")),
      billAmount: Number(formData.get("billAmount")),
    };

    updateState({
      ...state,
      services: [service, ...state.services],
    });
    setServiceMessage(`Service menu for ${service.day} added successfully.`);
    event.currentTarget.reset();
  };

  const addStaff = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const staffMember: StaffMember = {
      id: `s-${Date.now()}`,
      name: String(formData.get("name")),
      role: String(formData.get("role")),
      attendance: String(formData.get("attendance")) as StaffMember["attendance"],
      shift: String(formData.get("shift")),
      task: String(formData.get("task")),
    };

    updateState({
      ...state,
      staff: [staffMember, ...state.staff],
    });
    setStaffMessage(`${staffMember.name} added to staff records.`);
    event.currentTarget.reset();
  };

  const addExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateState({
      ...state,
      expenses: [
        {
          id: `e-${Date.now()}`,
          label: String(formData.get("label")),
          category: String(formData.get("category")),
          amount: Number(formData.get("amount")),
          date: String(formData.get("date")),
        },
        ...state.expenses,
      ],
    });
    event.currentTarget.reset();
  };

  const addHousekeeping = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const roomNumber = String(formData.get("roomNumber")).trim();

    if (state.housekeeping.some((item) => item.roomNumber === roomNumber)) {
      setHousekeepingMessage(`Housekeeping entry for room ${roomNumber} already exists.`);
      return;
    }

    const entry: HousekeepingItem = {
      roomNumber,
      status: String(formData.get("status")) as HousekeepingItem["status"],
      laundry: String(formData.get("laundry")),
      note: String(formData.get("note")),
    };

    updateState({
      ...state,
      housekeeping: [entry, ...state.housekeeping],
    });
    setHousekeepingMessage(`Housekeeping entry added for room ${roomNumber}.`);
    event.currentTarget.reset();
  };

  const addInventory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const itemName = String(formData.get("name")).trim();

    const inventoryItem: InventoryItem = {
      id: `i-${Date.now()}`,
      name: itemName,
      stock: Number(formData.get("stock")),
      minimum: Number(formData.get("minimum")),
      unit: String(formData.get("unit")),
    };

    updateState({
      ...state,
      inventory: [inventoryItem, ...state.inventory],
    });
    setInventoryMessage(`${inventoryItem.name} added to inventory.`);
    event.currentTarget.reset();
  };

  const addSubAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentUser?.role !== "admin") {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const permissions = formData
      .getAll("permissions")
      .map((value) => String(value)) as Permission[];
    const username = String(formData.get("username")).trim();

    if (!permissions.length) {
      setUserMessage("Select at least one permission for the new parent admin.");
      return;
    }

    if (state.users.some((user) => user.username === username)) {
      setUserMessage("That username already exists. Choose a different one.");
      return;
    }

    const user: User = {
      id: `u-${Date.now()}`,
      name: String(formData.get("name")),
      username,
      password: String(formData.get("password")),
      role: "parent-admin",
      permissions,
    };

    updateState({
      ...state,
      users: [...state.users, user],
    });
    setUserMessage(`Parent admin ${user.name} created successfully.`);
    event.currentTarget.reset();
  };

  const checkInGuest = (guestId: string) => {
    const targetGuest = state.guests.find((guest) => guest.id === guestId);

    if (!targetGuest?.roomId) {
      setGuestMessage("Assign a room before checking in this guest.");
      return;
    }

    updateState({
      ...state,
      guests: state.guests.map((guest) =>
        guest.id === guestId ? { ...guest, status: "checked-in" } : guest,
      ),
      rooms: state.rooms.map((room) =>
        room.id === targetGuest.roomId
          ? {
              ...room,
              status: "occupied",
              lastGuest: targetGuest.name,
            }
          : room,
      ),
    });
    setGuestMessage(`${targetGuest.name} checked in to room ${targetGuest.roomId}.`);
  };

  const checkOutGuest = (guestId: string) => {
    const targetGuest = state.guests.find((guest) => guest.id === guestId);

    if (!targetGuest) {
      return;
    }

    updateState({
      ...state,
      guests: state.guests.map((guest) =>
        guest.id === guestId ? { ...guest, status: "checked-out" } : guest,
      ),
      rooms: state.rooms.map((room) =>
        room.id === targetGuest.roomId
          ? {
              ...room,
              status: "vacant",
              lastGuest: targetGuest.name,
            }
          : room,
      ),
    });
    setGuestMessage(`${targetGuest.name} checked out successfully.`);
  };

  if (!currentUser) {
    return (
      <div className="login-shell">
        <div className="login-panel brand-card">
          <span className="eyebrow">Lodge Management Software</span>
          <h1>Professional monochrome operations for growing properties.</h1>
          <p>
            White theme by default, black theme on demand, and practical modules
            for guests, rooms, staff, services, inventory, and billing.
          </p>
          <div className="feature-grid">
            <div>
              <strong>White by default</strong>
              <span>Clean daily operations view with strong readability.</span>
            </div>
            <div>
              <strong>Black on toggle</strong>
              <span>Switch to a dark working mode whenever you want.</span>
            </div>
            <div>
              <strong>Action-ready modules</strong>
              <span>Add rooms, employees, services, stock, and housekeeping entries.</span>
            </div>
          </div>
        </div>

        <form className="login-panel" onSubmit={handleLogin}>
          <div className="login-head">
            <div>
              <span className="eyebrow">Admin Login</span>
              <h2>Sign in</h2>
            </div>
            <button className="theme-toggle" type="button" onClick={toggleTheme}>
              {theme === "white" ? "Black theme" : "White theme"}
            </button>
          </div>

          <label>
            Username
            <input name="username" placeholder="admin" required />
          </label>
          <label>
            Password
            <input name="password" type="password" placeholder="********" required />
          </label>
          {loginError ? <p className="error-text">{loginError}</p> : null}
          <button className="primary-button" type="submit">
            Access dashboard
          </button>
          <div className="login-help">
            <span>Default admin:</span>
            <strong>`admin` / `Admin@123`</strong>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <span className="eyebrow">LMS</span>
          <h2>Operational console</h2>
          <p>Minimal black and white interface for one property or many.</p>
          <span className="sync-badge">{syncStatus}</span>
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter((item) => allowedPermissions.includes(item.key))
            .map((item) => (
              <NavLink
                key={item.key}
                to={`/${item.key}`}
                className={({ isActive }) =>
                  `nav-item${isActive ? " nav-item-active" : ""}`
                }
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </NavLink>
            ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">{currentUser.role}</span>
            <h1>{currentUser.name}</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={toggleTheme}>
              {theme === "white" ? "Black theme" : "White theme"}
            </button>
            <button className="primary-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <Routes>
          <Route
            path="/"
            element={<Navigate to={`/${allowedPermissions[0] || "dashboard"}`} replace />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute permission="dashboard" allowed={allowedPermissions}>
                <DashboardPage state={state} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guests"
            element={
              <ProtectedRoute permission="guests" allowed={allowedPermissions}>
                <GuestsPage
                  state={state}
                  feedback={guestMessage}
                  onAddGuest={addGuest}
                  onCheckInGuest={checkInGuest}
                  onCheckOutGuest={checkOutGuest}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <ProtectedRoute permission="rooms" allowed={allowedPermissions}>
                <RoomsPage state={state} feedback={roomMessage} onAddRoom={addRoom} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services"
            element={
              <ProtectedRoute permission="services" allowed={allowedPermissions}>
                <ServicesPage
                  state={state}
                  feedback={serviceMessage}
                  onAddService={addService}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute permission="staff" allowed={allowedPermissions}>
                <StaffPage state={state} feedback={staffMessage} onAddStaff={addStaff} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute permission="expenses" allowed={allowedPermissions}>
                <ExpensesPage state={state} onAddExpense={addExpense} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/housekeeping"
            element={
              <ProtectedRoute permission="housekeeping" allowed={allowedPermissions}>
                <HousekeepingPage
                  state={state}
                  feedback={housekeepingMessage}
                  onAddHousekeeping={addHousekeeping}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute permission="billing" allowed={allowedPermissions}>
                <BillingPage state={state} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounting"
            element={
              <ProtectedRoute permission="accounting" allowed={allowedPermissions}>
                <AccountingPage state={state} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute permission="inventory" allowed={allowedPermissions}>
                <InventoryPage
                  state={state}
                  feedback={inventoryMessage}
                  onAddInventory={addInventory}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute permission="analytics" allowed={allowedPermissions}>
                <AnalyticsPage state={state} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/safety"
            element={
              <ProtectedRoute permission="safety" allowed={allowedPermissions}>
                <SafetyPage state={state} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute permission="users" allowed={allowedPermissions}>
                <UsersPage
                  state={state}
                  currentUser={currentUser}
                  feedback={userMessage}
                  onAddSubAdmin={addSubAdmin}
                />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function ProtectedRoute({
  permission,
  allowed,
  children,
}: {
  permission: Permission;
  allowed: Permission[];
  children: React.ReactNode;
}) {
  if (!allowed.includes(permission)) {
    return <Navigate to={`/${allowed[0] || "dashboard"}`} replace />;
  }

  return <>{children}</>;
}

function DashboardPage({ state }: { state: AppState }) {
  const occupiedRooms = state.rooms.filter((room) => room.status === "occupied").length;
  const vacantRooms = state.rooms.filter((room) => room.status === "vacant").length;
  const monthlyRevenue = state.invoices.reduce(
    (sum, invoice) => sum + invoice.amount + invoice.tax,
    0,
  );
  const monthlyExpenses = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const lowStockItems = state.inventory.filter((item) => item.stock <= item.minimum);
  const pendingInvoices = state.invoices.filter((invoice) => invoice.status === "Pending");
  const urgentSafetyItems = state.safety.filter((item) => item.status !== "Done");
  const blockedRooms = state.rooms.filter((room) => room.status === "blocked");
  const alerts = [
    ...blockedRooms.map((room) => `Room ${room.number} is blocked for maintenance`),
    ...lowStockItems.map((item) => `${item.name} is below minimum stock`),
    ...pendingInvoices.map((invoice) => `${invoice.id} is waiting for payment follow-up`),
    ...urgentSafetyItems.map((item) => `${item.title} is marked ${item.status.toLowerCase()}`),
  ].slice(0, 4);

  return (
    <div className="page-grid">
      <section className="hero-card">
        <div>
          <span className="eyebrow">Today at a glance</span>
          <h2>Responsive command center for front desk and operations.</h2>
          <p>
            Real-time room visibility, guest lifecycle tracking, service billing,
            staffing, inventory alerts, and safety checks in one panel.
          </p>
        </div>
        <div className="hero-kpis">
          <StatCard
            title="Occupied rooms"
            value={String(occupiedRooms)}
            note="Current active guests"
          />
          <StatCard
            title="Vacant rooms"
            value={String(vacantRooms)}
            note="Ready for allotment"
          />
          <StatCard
            title="Revenue"
            value={currency(monthlyRevenue)}
            note="Invoices including GST"
          />
          <StatCard
            title="Expenses"
            value={currency(monthlyExpenses)}
            note="Current tracked outflow"
          />
        </div>
      </section>

      <SectionCard
        title="Room performance"
        subtitle="Occupancy and room type revenue mix"
      >
        <div className="bar-list">
          {[
            {
              label: "Standard",
              value: 48,
            },
            {
              label: "Deluxe",
              value: 72,
            },
            {
              label: "Suite",
              value: 38,
            },
          ].map((item) => (
            <div className="bar-row" key={item.label}>
              <span>{item.label}</span>
              <div>
                <div style={{ width: `${item.value}%` }} />
              </div>
              <strong>{item.value}%</strong>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Alerts"
        subtitle="Operational issues requiring quick action"
      >
        <div className="pill-grid">
          {alerts.map((alert) => (
            <span className="pill" key={alert}>
              {alert}
            </span>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function GuestsPage({
  state,
  feedback,
  onAddGuest,
  onCheckInGuest,
  onCheckOutGuest,
}: {
  state: AppState;
  feedback: string;
  onAddGuest: (event: FormEvent<HTMLFormElement>) => void;
  onCheckInGuest: (guestId: string) => void;
  onCheckOutGuest: (guestId: string) => void;
}) {
  return (
    <div className="page-grid two-columns">
      <SectionCard
        title="Customer entry and check-in"
        subtitle="ID proof, preferences, emergency contact, and room suggestion"
      >
        <form className="form-grid" onSubmit={onAddGuest}>
          <input name="name" placeholder="Guest name" required />
          <input name="phone" placeholder="Phone number" required />
          <input name="idProof" placeholder="ID proof upload reference" required />
          <select name="roomPreference" defaultValue="Deluxe">
            <option>Standard</option>
            <option>Deluxe</option>
            <option>Suite</option>
          </select>
          <input name="serviceTiming" placeholder="Breakfast / tea timing" required />
          <input name="emergencyContact" placeholder="Emergency contact" required />
          <button className="primary-button" type="submit">
            Save guest and reserve room
          </button>
          {feedback ? <p className="muted-text form-feedback">{feedback}</p> : null}
        </form>
      </SectionCard>

      <SectionCard
        title="Guest register"
        subtitle="Returning guests auto-flagged for faster service"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Status</th>
                <th>Room</th>
                <th>Preference</th>
                <th>Emergency</th>
              </tr>
            </thead>
            <tbody>
              {state.guests.map((guest) => (
                <tr key={guest.id}>
                  <td>
                    <strong>{guest.name}</strong>
                    <span>{guest.returning ? "Returning guest" : guest.phone}</span>
                  </td>
                  <td>{guest.status}</td>
                  <td>{guest.roomId || "Awaiting"}</td>
                  <td>{guest.roomPreference}</td>
                  <td>
                    <strong>{guest.emergencyContact}</strong>
                    <div className="table-actions">
                      {guest.status === "reserved" ? (
                        <button
                          className="ghost-button compact-button"
                          type="button"
                          onClick={() => onCheckInGuest(guest.id)}
                        >
                          Check in
                        </button>
                      ) : null}
                      {guest.status === "checked-in" ? (
                        <button
                          className="ghost-button compact-button"
                          type="button"
                          onClick={() => onCheckOutGuest(guest.id)}
                        >
                          Check out
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function RoomsPage({
  state,
  feedback,
  onAddRoom,
}: {
  state: AppState;
  feedback: string;
  onAddRoom: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const roomSummary = [
    {
      label: "Occupied",
      value: state.rooms.filter((room) => room.status === "occupied").length,
    },
    {
      label: "Reserved",
      value: state.rooms.filter((room) => room.status === "reserved").length,
    },
    {
      label: "Vacant",
      value: state.rooms.filter((room) => room.status === "vacant").length,
    },
    {
      label: "Blocked",
      value: state.rooms.filter((room) => room.status === "blocked").length,
    },
  ];

  return (
    <div className="page-grid two-columns">
      <SectionCard title="Add room" subtitle="Create a new room and set its current status">
        <form className="form-grid" onSubmit={onAddRoom}>
          <input name="number" placeholder="Room number" required />
          <select name="type" defaultValue="Deluxe">
            <option>Standard</option>
            <option>Deluxe</option>
            <option>Suite</option>
          </select>
          <input name="price" type="number" min="1" placeholder="Nightly price" required />
          <select name="status" defaultValue="vacant">
            <option value="vacant">Vacant</option>
            <option value="reserved">Reserved</option>
            <option value="occupied">Occupied</option>
            <option value="blocked">Blocked</option>
          </select>
          <input name="lastGuest" placeholder="Last guest or note" />
          <button className="primary-button" type="submit">
            Add room
          </button>
          {feedback ? <p className="muted-text form-feedback">{feedback}</p> : null}
        </form>
      </SectionCard>

      <SectionCard
        title="Room allotment"
        subtitle="Real-time room availability with type-aware suggestions"
      >
        <div className="stat-grid">
          {roomSummary.map((item) => (
            <StatCard
              key={item.label}
              title={item.label}
              value={String(item.value)}
              note="Current room state"
            />
          ))}
        </div>
        <div className="room-grid">
          {state.rooms.map((room) => (
            <article className="room-card" key={room.id}>
              <div className="room-card-head">
                <h3>Room {room.number}</h3>
                <span className={`status-badge status-${room.status}`}>{room.status}</span>
              </div>
              <p>{room.type}</p>
              <strong>{currency(room.price)}</strong>
              <span>Last used by: {room.lastGuest}</span>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ServicesPage({
  state,
  feedback,
  onAddService,
}: {
  state: AppState;
  feedback: string;
  onAddService: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="page-grid two-columns">
      <SectionCard
        title="Add service menu"
        subtitle="Create breakfast and tea service entries with bill amount"
      >
        <form className="form-grid" onSubmit={onAddService}>
          <select name="day" defaultValue="Monday">
            <option>Monday</option>
            <option>Tuesday</option>
            <option>Wednesday</option>
            <option>Thursday</option>
            <option>Friday</option>
            <option>Saturday</option>
            <option>Sunday</option>
          </select>
          <input name="breakfast" placeholder="Breakfast menu" required />
          <input name="tea" placeholder="Tea service" required />
          <input name="timing" placeholder="Timing" required />
          <input name="billAmount" type="number" min="0" placeholder="Bill amount" required />
          <button className="primary-button" type="submit">
            Add service
          </button>
          {feedback ? <p className="muted-text form-feedback">{feedback}</p> : null}
        </form>
      </SectionCard>

      <SectionCard
        title="Breakfast and tea service"
        subtitle="Day-wise menu chart with billing integration"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Breakfast</th>
                <th>Tea service</th>
                <th>Timing</th>
                <th>Bill add-on</th>
              </tr>
            </thead>
            <tbody>
              {state.services.map((item, index) => (
                <tr key={`${item.day}-${index}`}>
                  <td>{item.day}</td>
                  <td>{item.breakfast}</td>
                  <td>{item.tea}</td>
                  <td>{item.timing}</td>
                  <td>{currency(item.billAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function StaffPage({
  state,
  feedback,
  onAddStaff,
}: {
  state: AppState;
  feedback: string;
  onAddStaff: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="page-grid two-columns">
      <SectionCard title="Add employee" subtitle="Create employee, shift, and attendance records">
        <form className="form-grid" onSubmit={onAddStaff}>
          <input name="name" placeholder="Employee name" required />
          <input name="role" placeholder="Role" required />
          <select name="attendance" defaultValue="Present">
            <option>Present</option>
            <option>Absent</option>
            <option>Late</option>
          </select>
          <input name="shift" placeholder="Shift timing" required />
          <input name="task" placeholder="Assigned task" required />
          <button className="primary-button" type="submit">
            Add employee
          </button>
          {feedback ? <p className="muted-text form-feedback">{feedback}</p> : null}
        </form>
      </SectionCard>

      <SectionCard
        title="Staff management"
        subtitle="Attendance, shift planning, and task allocation"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Attendance</th>
                <th>Shift</th>
                <th>Assigned task</th>
              </tr>
            </thead>
            <tbody>
              {state.staff.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.role}</td>
                  <td>{member.attendance}</td>
                  <td>{member.shift}</td>
                  <td>{member.task}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function ExpensesPage({
  state,
  onAddExpense,
}: {
  state: AppState;
  onAddExpense: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="page-grid two-columns">
      <SectionCard
        title="Expense tracker"
        subtitle="Day-wise, weekly, and monthly expense entries"
      >
        <form className="form-grid" onSubmit={onAddExpense}>
          <input name="label" placeholder="Expense label" required />
          <select name="category" defaultValue="Maintenance">
            <option>Maintenance</option>
            <option>Utility</option>
            <option>Supplies</option>
            <option>Groceries</option>
          </select>
          <input name="amount" type="number" min="1" placeholder="Amount" required />
          <input name="date" type="date" required />
          <button className="primary-button" type="submit">
            Add expense
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Recorded expenses"
        subtitle="Recent spend by category"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {state.expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.label}</td>
                  <td>{expense.category}</td>
                  <td>{expense.date}</td>
                  <td>{currency(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function HousekeepingPage({
  state,
  feedback,
  onAddHousekeeping,
}: {
  state: AppState;
  feedback: string;
  onAddHousekeeping: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="page-grid two-columns">
      <SectionCard
        title="Add housekeeping entry"
        subtitle="Track room cleaning, laundry, and readiness notes"
      >
        <form className="form-grid" onSubmit={onAddHousekeeping}>
          <input name="roomNumber" placeholder="Room number" required />
          <select name="status" defaultValue="pending">
            <option value="cleaned">Cleaned</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
          </select>
          <input name="laundry" placeholder="Laundry status" required />
          <input name="note" placeholder="Housekeeping note" required />
          <button className="primary-button" type="submit">
            Add housekeeping
          </button>
          {feedback ? <p className="muted-text form-feedback">{feedback}</p> : null}
        </form>
      </SectionCard>

      <SectionCard
        title="Housekeeping module"
        subtitle="Cleaning states, laundry tracking, and checkout alerts"
      >
        <div className="room-grid">
          {state.housekeeping.map((item) => (
            <article className="room-card" key={item.roomNumber}>
              <div className="room-card-head">
                <h3>Room {item.roomNumber}</h3>
                <span className={`status-badge status-${item.status}`}>{item.status}</span>
              </div>
              <p>{item.note}</p>
              <span>{item.laundry}</span>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function BillingPage({ state }: { state: AppState }) {
  return (
    <div className="page-grid">
      <SectionCard
        title="Billing system"
        subtitle="GST-aware invoice records and payment tracking"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Guest</th>
                <th>Base amount</th>
                <th>GST</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.id}</td>
                  <td>{invoice.guestName}</td>
                  <td>{currency(invoice.amount)}</td>
                  <td>{currency(invoice.tax)}</td>
                  <td>{invoice.paymentMode}</td>
                  <td>{invoice.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function AccountingPage({ state }: { state: AppState }) {
  const revenue = state.invoices.reduce((sum, invoice) => sum + invoice.amount + invoice.tax, 0);
  const expenses = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const profit = revenue - expenses;

  return (
    <div className="page-grid">
      <SectionCard
        title="Accounting overview"
        subtitle="Profit and loss with expense vs revenue snapshot"
      >
        <div className="stat-grid">
          <StatCard title="Revenue" value={currency(revenue)} note="Collected + pending" />
          <StatCard title="Expenses" value={currency(expenses)} note="Tracked operating costs" />
          <StatCard title="Net position" value={currency(profit)} note="Current P&L status" />
        </div>
      </SectionCard>
    </div>
  );
}

function InventoryPage({
  state,
  feedback,
  onAddInventory,
}: {
  state: AppState;
  feedback: string;
  onAddInventory: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="page-grid two-columns">
      <SectionCard
        title="Add inventory item"
        subtitle="Create stock records with minimum alert levels"
      >
        <form className="form-grid" onSubmit={onAddInventory}>
          <input name="name" placeholder="Item name" required />
          <input name="stock" type="number" min="0" placeholder="Current stock" required />
          <input name="minimum" type="number" min="0" placeholder="Minimum stock" required />
          <input name="unit" placeholder="Unit, for example pcs or boxes" required />
          <button className="primary-button" type="submit">
            Add inventory
          </button>
          {feedback ? <p className="muted-text form-feedback">{feedback}</p> : null}
        </form>
      </SectionCard>

      <SectionCard
        title="Inventory management"
        subtitle="Track lodge supplies and receive low-stock alerts"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Stock</th>
                <th>Minimum</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.inventory.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    {item.stock} {item.unit}
                  </td>
                  <td>
                    {item.minimum} {item.unit}
                  </td>
                  <td>{item.stock <= item.minimum ? "Low stock" : "Healthy"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function AnalyticsPage({ state }: { state: AppState }) {
  const revenueBars = [
    {
      label: "Rooms",
      value: 76,
    },
    {
      label: "Breakfast & Tea",
      value: 32,
    },
    {
      label: "Seasonal uplift",
      value: 58,
    },
  ];

  return (
    <div className="page-grid two-columns">
      <SectionCard
        title="Analytics dashboard"
        subtitle="Occupancy and revenue trend views"
      >
        <div className="bar-list">
          {revenueBars.map((bar) => (
            <div className="bar-row" key={bar.label}>
              <span>{bar.label}</span>
              <div>
                <div style={{ width: `${bar.value}%` }} />
              </div>
              <strong>{bar.value}%</strong>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Top spenders" subtitle="Guest and room performance">
        <div className="list-stack">
          <div className="list-item">
            <strong>Arjun Mehta</strong>
            <span>{currency(9723)} total spend</span>
          </div>
          <div className="list-item">
            <strong>Room 103</strong>
            <span>{currency(18450)} seasonal revenue</span>
          </div>
          <div className="list-item">
            <strong>Deluxe rooms</strong>
            <span>Highest occupancy mix this month</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function SafetyPage({ state }: { state: AppState }) {
  return (
    <div className="page-grid">
      <SectionCard
        title="Emergency contact and safety"
        subtitle="Doctor service references and fire safety checklist"
      >
        <div className="list-stack">
          <div className="list-item">
            <strong>Emergency doctor</strong>
            <span>City Care Clinic / +91 98000 11223</span>
          </div>
          {state.safety.map((item) => (
            <div className="list-item" key={item.id}>
              <strong>{item.title}</strong>
              <span>
                {item.owner} / {item.status}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function UsersPage({
  state,
  currentUser,
  feedback,
  onAddSubAdmin,
}: {
  state: AppState;
  currentUser: User;
  feedback: string;
  onAddSubAdmin: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="page-grid two-columns">
      <SectionCard
        title="Access control"
        subtitle="Admin can create parent admins with limited module access"
      >
        {currentUser.role !== "admin" ? (
          <p className="muted-text">
            Only the main admin can create or change parent-admin accounts.
          </p>
        ) : (
          <form className="form-grid" onSubmit={onAddSubAdmin}>
            <input name="name" placeholder="Full name" required />
            <input name="username" placeholder="Username" required />
            <input name="password" placeholder="Temporary password" required />
            <div className="permission-grid">
              {allPermissions
                .filter((permission) => permission !== "users")
                .map((permission) => (
                  <label className="checkbox-row" key={permission}>
                    <input name="permissions" type="checkbox" value={permission} />
                    <span>{permission}</span>
                  </label>
                ))}
            </div>
            <button className="primary-button" type="submit">
              Create parent admin
            </button>
            {feedback ? <p className="muted-text form-feedback">{feedback}</p> : null}
          </form>
        )}
      </SectionCard>

      <SectionCard title="Current users" subtitle="Roles and assigned permissions">
        <div className="list-stack">
          {state.users.map((user) => (
            <div className="list-item" key={user.id}>
              <strong>
                {user.name} / {user.role}
              </strong>
              <span>{user.permissions.join(", ")}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function suggestRoom(rooms: Room[], preference: string) {
  return (
    rooms.find((room) => room.type === preference && room.status === "vacant") ||
    rooms.find((room) => room.status === "vacant")
  );
}

export default App;
