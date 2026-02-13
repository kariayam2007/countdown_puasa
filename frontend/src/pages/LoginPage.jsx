import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, User, Eye, EyeOff } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoginPage = () => {
  const navigate = useNavigate();
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    checkSetup();
    checkExistingAuth();
  }, []);

  const checkSetup = async () => {
    try {
      const response = await axios.get(`${API}/auth/check-setup`);
      setIsSetup(response.data.needs_setup);
    } catch (error) {
      console.error("Error checking setup:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAuth = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try {
        await axios.get(`${API}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate("/admin");
      } catch {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_username");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSetup) {
      // Setup mode - create new admin
      if (form.password !== form.confirmPassword) {
        toast.error("Password tidak cocok");
        return;
      }
      if (form.password.length < 6) {
        toast.error("Password minimal 6 karakter");
        return;
      }
      
      try {
        const response = await axios.post(`${API}/auth/setup`, {
          username: form.username,
          password: form.password
        });
        localStorage.setItem("admin_token", response.data.token);
        localStorage.setItem("admin_username", response.data.username);
        toast.success("Admin berhasil dibuat!");
        navigate("/admin");
      } catch (error) {
        toast.error(error.response?.data?.detail || "Gagal membuat admin");
      }
    } else {
      // Login mode
      try {
        const response = await axios.post(`${API}/auth/login`, {
          username: form.username,
          password: form.password
        });
        localStorage.setItem("admin_token", response.data.token);
        localStorage.setItem("admin_username", response.data.username);
        toast.success("Login berhasil!");
        navigate("/admin");
      } catch (error) {
        toast.error(error.response?.data?.detail || "Login gagal");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-frestea-dark flex items-center justify-center">
        <div className="text-frestea-gold text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-frestea-dark flex items-center justify-center p-4"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1756999386217-a82d882d407d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMHB1cnBsZSUyMGFuZCUyMGdyZWVuJTIwZ3JhZGllbnQlMjBsaXF1aWQlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3MDk2MDIyMHww&ixlib=rb-4.1.0&q=85')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
      data-testid="login-page"
    >
      <div className="absolute inset-0 bg-frestea-dark/80" />
      
      <Card className="w-full max-w-md relative z-10 admin-card border-frestea-purple/30">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-frestea-purple/20 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-frestea-gold" />
          </div>
          <CardTitle className="font-heading text-3xl text-white">
            {isSetup ? "Setup Admin" : "Admin Login"}
          </CardTitle>
          <CardDescription className="text-purple-300">
            {isSetup 
              ? "Buat akun admin pertama untuk mengakses panel" 
              : "Masukkan kredensial untuk mengakses admin panel"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-purple-300">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
                <Input
                  type="text"
                  placeholder="admin"
                  value={form.username}
                  onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                  className="pl-10 bg-frestea-dark border-frestea-purple/30 text-white"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-purple-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10 pr-10 bg-frestea-dark border-frestea-purple/30 text-white"
                  required
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSetup && (
              <div className="space-y-2">
                <Label className="text-purple-300">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10 bg-frestea-dark border-frestea-purple/30 text-white"
                    required
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-frestea-purple hover:bg-frestea-purple/80 text-white"
              data-testid="login-submit-btn"
            >
              {isSetup ? "Buat Admin" : "Login"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a 
              href="/" 
              className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              ← Kembali ke Display
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
