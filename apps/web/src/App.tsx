import { Routes, Route, Navigate } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { RequireAuth } from "./components/layout/RequireAuth";
import { InstallBanner } from "./pwa/InstallBanner";

// Public / marketing
import { Landing } from "./pages/public/Landing";
import { Login } from "./pages/public/Login";
import { Register } from "./pages/public/Register";
import { TrackPublic } from "./pages/public/TrackPublic";
import { CarrierJoin } from "./pages/public/CarrierJoin";
import { VerifyEmail } from "./pages/public/VerifyEmail";
import { PublicLanes } from "./pages/public/Lanes";
import { PublicQuote } from "./pages/public/Quote";

// Carrier
import { CarrierLoadboard } from "./pages/carrier/Loadboard";
import { CarrierMyLoads } from "./pages/carrier/MyLoads";
import { CarrierDispatch } from "./pages/carrier/Dispatch";
import { CarrierDrivers } from "./pages/carrier/Drivers";
import { CarrierDriverDetail } from "./pages/carrier/DriverDetail";
import { CarrierTrucks } from "./pages/carrier/Trucks";
import { CarrierSettlements } from "./pages/carrier/Settlements";
import { CarrierCompliance } from "./pages/carrier/Compliance";

// Shipper
import { ShipperDashboard } from "./pages/shipper/Dashboard";
import { ShipperPostLoad } from "./pages/shipper/PostLoad";
import { ShipperLoadDetail } from "./pages/shipper/LoadDetail";
import { ShipperLoadHistory } from "./pages/shipper/LoadHistory";
import { ShipperInvoices } from "./pages/shipper/Invoices";
import { ShipperDedicatedLanes } from "./pages/shipper/DedicatedLanes";

// Admin
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminUsers } from "./pages/admin/Users";
import { AdminCarriers } from "./pages/admin/Carriers";
import { AdminShippers } from "./pages/admin/Shippers";
import { AdminAgents } from "./pages/admin/Agents";
import { AdminInvoices } from "./pages/admin/Invoices";
import { AdminLoads } from "./pages/admin/Loads";
import { AdminPush } from "./pages/admin/Push";

// Agent
import { AgentDashboard } from "./pages/agent/Dashboard";
import { AgentLoads } from "./pages/agent/Loads";
import { AgentShippers } from "./pages/agent/Shippers";
import { AgentCommissions } from "./pages/agent/Commissions";
import { AgentPostLoad } from "./pages/agent/PostLoad";

export default function App() {
  return (
    <>
      <InstallBanner />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/track/:reference" element={<TrackPublic />} />
        <Route path="/carrier/join" element={<CarrierJoin />} />
        <Route path="/lanes" element={<PublicLanes />} />
        <Route path="/quote" element={<PublicQuote />} />

        {/* Authenticated app shell */}
        <Route element={<RequireAuth><Shell /></RequireAuth>}>
          {/* Carrier */}
          <Route path="/carrier" element={<Navigate to="/loadboard" replace />} />
          <Route path="/loadboard" element={<CarrierLoadboard />} />
          <Route path="/carrier/loadboard" element={<Navigate to="/loadboard" replace />} />
          <Route path="/carrier/my-loads" element={<CarrierMyLoads />} />
          <Route path="/carrier/dispatch" element={<CarrierDispatch />} />
          <Route path="/carrier/drivers" element={<CarrierDrivers />} />
          <Route path="/carrier/drivers/:id" element={<CarrierDriverDetail />} />
          <Route path="/carrier/trucks" element={<CarrierTrucks />} />
          <Route path="/carrier/settlements" element={<CarrierSettlements />} />
          <Route path="/carrier/compliance" element={<CarrierCompliance />} />

          {/* Shipper */}
          <Route path="/shipper" element={<Navigate to="/shipper/dashboard" replace />} />
          <Route path="/shipper/dashboard" element={<ShipperDashboard />} />
          <Route path="/shipper/loads" element={<ShipperLoadHistory />} />
          <Route path="/shipper/loads/new" element={<ShipperPostLoad />} />
          <Route path="/shipper/loads/:id" element={<ShipperLoadDetail />} />
          <Route path="/shipper/invoices" element={<ShipperInvoices />} />
          <Route path="/shipper/lanes" element={<ShipperDedicatedLanes />} />

          {/* Agent */}
          <Route path="/agent" element={<Navigate to="/agent/dashboard" replace />} />
          <Route path="/agent/dashboard" element={<AgentDashboard />} />
          <Route path="/agent/loads" element={<AgentLoads />} />
          <Route path="/agent/post-load" element={<AgentPostLoad />} />
          <Route path="/agent/shippers" element={<AgentShippers />} />
          <Route path="/agent/commissions" element={<AgentCommissions />} />

          {/* Admin */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/carriers" element={<AdminCarriers />} />
          <Route path="/admin/shippers" element={<AdminShippers />} />
          <Route path="/admin/agents" element={<AdminAgents />} />
          <Route path="/admin/loads" element={<AdminLoads />} />
          <Route path="/admin/invoices" element={<AdminInvoices />} />
          <Route path="/admin/push" element={<AdminPush />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
