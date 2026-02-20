import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Video, 
  CalendarDays, 
  Clock, 
  Play,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Users,
  Key,
  UserPlus,
  Upload,
  FileVideo,
  MapPin,
  Sunrise,
  Sunset
} from "lucide-react";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const navigate = useNavigate();
  const [tvcVideos, setTvcVideos] = useState([]);
  const [berbukaVideos, setBerbukaVideos] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [displayState, setDisplayState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem("admin_token");
    return { Authorization: `Bearer ${token}` };
  };

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      try {
        const response = await axios.get(`${API}/auth/verify`, {
          headers: getAuthHeader()
        });
        setUsername(response.data.username);
      } catch (error) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_username");
        navigate("/login");
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
    toast.success("Logout berhasil");
    navigate("/login");
  };

  // Form states
  const [newTvc, setNewTvc] = useState({ name: "", url: "", order: 0 });
  const [newBerbuka, setNewBerbuka] = useState({ name: "", url: "", duration_seconds: 300 });
  const [newSchedule, setNewSchedule] = useState({ date: "", subuh_time: "04:30", maghrib_time: "", location: "Bekasi" });
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingTvc, setEditingTvc] = useState(null);
  const [editingBerbuka, setEditingBerbuka] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  // User management states
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [changePassword, setChangePassword] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [resetPassword, setResetPassword] = useState({ user_id: "", password: "" });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  // Upload states
  const [uploadingTvc, setUploadingTvc] = useState(false);
  const [uploadingBerbuka, setUploadingBerbuka] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tvcRes, berbukaRes, scheduleRes, stateRes, usersRes] = await Promise.all([
        axios.get(`${API}/tvc-videos`),
        axios.get(`${API}/berbuka-videos`),
        axios.get(`${API}/schedules`),
        axios.get(`${API}/display-state`),
        axios.get(`${API}/auth/users`, { headers: getAuthHeader() })
      ]);
      setTvcVideos(tvcRes.data);
      setBerbukaVideos(berbukaRes.data);
      setSchedules(scheduleRes.data);
      setDisplayState(stateRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal memuat data");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // TVC Video handlers
  const handleUploadTvc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingTvc(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await axios.post(`${API}/upload/video`, formData, {
        headers: { 
          ...getAuthHeader(),
          "Content-Type": "multipart/form-data"
        }
      });
      
      // Auto-fill URL
      const videoUrl = `${BACKEND_URL}${response.data.url}`;
      setNewTvc(prev => ({ ...prev, url: videoUrl, name: file.name.replace(/\.[^/.]+$/, "") }));
      toast.success("Video berhasil diupload");
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error(error.response?.data?.detail || "Gagal upload video");
      }
    } finally {
      setUploadingTvc(false);
      e.target.value = "";
    }
  };

  const handleAddTvc = async () => {
    if (!newTvc.name || !newTvc.url) {
      toast.error("Nama dan URL video harus diisi");
      return;
    }
    try {
      await axios.post(`${API}/tvc-videos`, newTvc, { headers: getAuthHeader() });
      toast.success("Video TVC berhasil ditambahkan");
      setNewTvc({ name: "", url: "", order: 0 });
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal menambahkan video");
      }
    }
  };

  const handleUpdateTvc = async () => {
    if (!editingTvc) return;
    try {
      await axios.put(`${API}/tvc-videos/${editingTvc.id}`, editingTvc, { headers: getAuthHeader() });
      toast.success("Video TVC berhasil diupdate");
      setEditingTvc(null);
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal mengupdate video");
      }
    }
  };

  const handleDeleteTvc = async (id) => {
    try {
      await axios.delete(`${API}/tvc-videos/${id}`, { headers: getAuthHeader() });
      toast.success("Video TVC berhasil dihapus");
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal menghapus video");
      }
    }
  };

  const handleToggleTvc = async (video) => {
    try {
      await axios.put(`${API}/tvc-videos/${video.id}`, { is_active: !video.is_active }, { headers: getAuthHeader() });
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal mengubah status video");
      }
    }
  };

  // Berbuka Video handlers
  const handleUploadBerbuka = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingBerbuka(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await axios.post(`${API}/upload/video`, formData, {
        headers: { 
          ...getAuthHeader(),
          "Content-Type": "multipart/form-data"
        }
      });
      
      const videoUrl = `${BACKEND_URL}${response.data.url}`;
      setNewBerbuka(prev => ({ ...prev, url: videoUrl, name: file.name.replace(/\.[^/.]+$/, "") }));
      toast.success("Video berhasil diupload");
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error(error.response?.data?.detail || "Gagal upload video");
      }
    } finally {
      setUploadingBerbuka(false);
      e.target.value = "";
    }
  };

  const handleAddBerbuka = async () => {
    if (!newBerbuka.name || !newBerbuka.url) {
      toast.error("Nama dan URL video harus diisi");
      return;
    }
    try {
      await axios.post(`${API}/berbuka-videos`, newBerbuka, { headers: getAuthHeader() });
      toast.success("Video Berbuka berhasil ditambahkan");
      setNewBerbuka({ name: "", url: "", duration_seconds: 300 });
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal menambahkan video");
      }
    }
  };

  const handleUpdateBerbuka = async () => {
    if (!editingBerbuka) return;
    try {
      await axios.put(`${API}/berbuka-videos/${editingBerbuka.id}`, editingBerbuka, { headers: getAuthHeader() });
      toast.success("Video Berbuka berhasil diupdate");
      setEditingBerbuka(null);
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal mengupdate video");
      }
    }
  };

  const handleDeleteBerbuka = async (id) => {
    try {
      await axios.delete(`${API}/berbuka-videos/${id}`, { headers: getAuthHeader() });
      toast.success("Video Berbuka berhasil dihapus");
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal menghapus video");
      }
    }
  };

  const handleToggleBerbuka = async (video) => {
    try {
      await axios.put(`${API}/berbuka-videos/${video.id}`, { is_active: !video.is_active }, { headers: getAuthHeader() });
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal mengubah status video");
      }
    }
  };

  // Schedule handlers
  const handleAddSchedule = async () => {
    if (!newSchedule.date || !newSchedule.subuh_time || !newSchedule.maghrib_time) {
      toast.error("Tanggal, waktu subuh, dan waktu maghrib harus diisi");
      return;
    }
    try {
      await axios.post(`${API}/schedules`, newSchedule, { headers: getAuthHeader() });
      toast.success("Jadwal berhasil ditambahkan");
      setNewSchedule({ date: "", subuh_time: "04:30", maghrib_time: "", location: "Bekasi" });
      setSelectedDate(null);
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Gagal menambahkan jadwal");
      }
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;
    try {
      await axios.put(`${API}/schedules/${editingSchedule.id}`, editingSchedule, { headers: getAuthHeader() });
      toast.success("Jadwal berhasil diupdate");
      setEditingSchedule(null);
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal mengupdate jadwal");
      }
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await axios.delete(`${API}/schedules/${id}`, { headers: getAuthHeader() });
      toast.success("Jadwal berhasil dihapus");
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error("Gagal menghapus jadwal");
      }
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setNewSchedule(prev => ({
      ...prev,
      date: format(date, "yyyy-MM-dd")
    }));
  };

  // User management handlers
  const handleChangePassword = async () => {
    if (changePassword.new_password !== changePassword.confirm_password) {
      toast.error("Password baru tidak cocok");
      return;
    }
    if (changePassword.new_password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: changePassword.current_password,
        new_password: changePassword.new_password
      }, { headers: getAuthHeader() });
      toast.success("Password berhasil diubah");
      setChangePassword({ current_password: "", new_password: "", confirm_password: "" });
      setShowChangePassword(false);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error(error.response?.data?.detail || "Password lama salah");
      } else {
        toast.error(error.response?.data?.detail || "Gagal mengubah password");
      }
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error("Username dan password harus diisi");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    try {
      await axios.post(`${API}/auth/users`, newUser, { headers: getAuthHeader() });
      toast.success("User berhasil ditambahkan");
      setNewUser({ username: "", password: "" });
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error(error.response?.data?.detail || "Gagal menambahkan user");
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/auth/users/${userId}`, { headers: getAuthHeader() });
      toast.success("User berhasil dihapus");
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        toast.error(error.response?.data?.detail || "Gagal menghapus user");
      }
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassword.password || resetPassword.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    try {
      await axios.put(`${API}/auth/users/${resetPassword.user_id}/reset-password`, {
        username: "",
        password: resetPassword.password
      }, { headers: getAuthHeader() });
      toast.success("Password berhasil direset");
      setResetPassword({ user_id: "", password: "" });
      setShowResetPassword(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal mereset password");
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
    <div className="min-h-screen bg-frestea-dark p-6" data-testid="admin-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <a href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </a>
          <div>
            <h1 className="font-heading text-4xl text-white">Admin Panel</h1>
            <p className="text-purple-300">Kelola Video dan Jadwal Maghrib</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* User info */}
          <span className="text-purple-300 text-sm">
            Logged in as: <span className="text-frestea-green font-semibold">{username}</span>
          </span>
          {/* Current State Badge */}
          <span 
            className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${
              displayState?.state === "tvc" ? "bg-frestea-purple text-white" :
              displayState?.state === "countdown" ? "bg-frestea-gold text-black" :
              "bg-frestea-green text-black"
            }`}
            data-testid="current-state-badge"
          >
            Status: {displayState?.state || "Unknown"}
          </span>
          <Button onClick={fetchData} variant="outline" size="icon" data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={handleLogout} variant="destructive" size="sm" data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tvc" className="space-y-6">
        <TabsList className="bg-frestea-surface border border-frestea-purple/30">
          <TabsTrigger value="tvc" className="data-[state=active]:bg-frestea-purple" data-testid="tab-tvc">
            <Video className="w-4 h-4 mr-2" />
            Video TVC
          </TabsTrigger>
          <TabsTrigger value="berbuka" className="data-[state=active]:bg-frestea-green data-[state=active]:text-black" data-testid="tab-berbuka">
            <Play className="w-4 h-4 mr-2" />
            Video Berbuka
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-frestea-gold data-[state=active]:text-black" data-testid="tab-schedule">
            <CalendarDays className="w-4 h-4 mr-2" />
            Jadwal Maghrib
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-600" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Kelola User
          </TabsTrigger>
        </TabsList>

        {/* TVC Videos Tab */}
        <TabsContent value="tvc">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-frestea-purple" />
                Video TVC
              </CardTitle>
              <CardDescription className="text-purple-300">
                Kelola daftar video TVC yang akan diputar dalam mode looping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add TVC Form */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-frestea-dark/50 rounded-lg">
                <div>
                  <Label className="text-purple-300">Nama Video</Label>
                  <Input
                    placeholder="TVC Frestea 1"
                    value={newTvc.name}
                    onChange={(e) => setNewTvc(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-frestea-surface border-frestea-purple/30"
                    data-testid="tvc-name-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-purple-300">URL Video</Label>
                  <Input
                    placeholder="https://example.com/video.mp4"
                    value={newTvc.url}
                    onChange={(e) => setNewTvc(prev => ({ ...prev, url: e.target.value }))}
                    className="bg-frestea-surface border-frestea-purple/30"
                    data-testid="tvc-url-input"
                  />
                </div>
                <div>
                  <Label className="text-purple-300">Upload Video</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      onChange={handleUploadTvc}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingTvc}
                      data-testid="tvc-upload-input"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full border-dashed border-frestea-purple/50"
                      disabled={uploadingTvc}
                    >
                      {uploadingTvc ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingTvc ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddTvc} className="w-full bg-frestea-purple hover:bg-frestea-purple/80" data-testid="add-tvc-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah
                  </Button>
                </div>
              </div>

              {/* TVC List */}
              <Table>
                <TableHeader>
                  <TableRow className="border-frestea-purple/30">
                    <TableHead className="text-purple-300">Nama</TableHead>
                    <TableHead className="text-purple-300">URL</TableHead>
                    <TableHead className="text-purple-300">Order</TableHead>
                    <TableHead className="text-purple-300">Status</TableHead>
                    <TableHead className="text-purple-300 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tvcVideos.map((video) => (
                    <TableRow key={video.id} className="border-frestea-purple/30">
                      <TableCell className="text-white">{video.name}</TableCell>
                      <TableCell className="text-purple-300 max-w-[200px] truncate">{video.url}</TableCell>
                      <TableCell className="text-white">{video.order}</TableCell>
                      <TableCell>
                        <Switch
                          checked={video.is_active}
                          onCheckedChange={() => handleToggleTvc(video)}
                          data-testid={`tvc-toggle-${video.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setEditingTvc(video)}
                              data-testid={`edit-tvc-${video.id}`}
                            >
                              <Edit className="w-4 h-4 text-purple-400" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-frestea-surface border-frestea-purple/30">
                            <DialogHeader>
                              <DialogTitle className="text-white">Edit Video TVC</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-purple-300">Nama</Label>
                                <Input
                                  value={editingTvc?.name || ""}
                                  onChange={(e) => setEditingTvc(prev => ({ ...prev, name: e.target.value }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                              <div>
                                <Label className="text-purple-300">URL</Label>
                                <Input
                                  value={editingTvc?.url || ""}
                                  onChange={(e) => setEditingTvc(prev => ({ ...prev, url: e.target.value }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                              <div>
                                <Label className="text-purple-300">Order</Label>
                                <Input
                                  type="number"
                                  value={editingTvc?.order || 0}
                                  onChange={(e) => setEditingTvc(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="ghost">Batal</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={handleUpdateTvc} className="bg-frestea-purple">Simpan</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteTvc(video.id)}
                          data-testid={`delete-tvc-${video.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tvcVideos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-purple-400 py-8">
                        Belum ada video TVC
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Berbuka Videos Tab */}
        <TabsContent value="berbuka">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-frestea-green" />
                Video Berbuka
              </CardTitle>
              <CardDescription className="text-purple-300">
                Kelola video yang ditampilkan saat waktu berbuka (setelah countdown selesai)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Berbuka Form */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-frestea-dark/50 rounded-lg">
                <div>
                  <Label className="text-purple-300">Nama Video</Label>
                  <Input
                    placeholder="Video Berbuka 1"
                    value={newBerbuka.name}
                    onChange={(e) => setNewBerbuka(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-frestea-surface border-frestea-purple/30"
                    data-testid="berbuka-name-input"
                  />
                </div>
                <div>
                  <Label className="text-purple-300">URL Video</Label>
                  <Input
                    placeholder="https://example.com/berbuka.mp4"
                    value={newBerbuka.url}
                    onChange={(e) => setNewBerbuka(prev => ({ ...prev, url: e.target.value }))}
                    className="bg-frestea-surface border-frestea-purple/30"
                    data-testid="berbuka-url-input"
                  />
                </div>
                <div>
                  <Label className="text-purple-300">Upload Video</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      onChange={handleUploadBerbuka}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingBerbuka}
                      data-testid="berbuka-upload-input"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full border-dashed border-frestea-green/50"
                      disabled={uploadingBerbuka}
                    >
                      {uploadingBerbuka ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingBerbuka ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-purple-300">Durasi (detik)</Label>
                  <Input
                    type="number"
                    placeholder="300"
                    value={newBerbuka.duration_seconds}
                    onChange={(e) => setNewBerbuka(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) }))}
                    className="bg-frestea-surface border-frestea-purple/30"
                    data-testid="berbuka-duration-input"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddBerbuka} className="w-full bg-frestea-green text-black hover:bg-frestea-green/80" data-testid="add-berbuka-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah
                  </Button>
                </div>
              </div>

              {/* Berbuka List */}
              <Table>
                <TableHeader>
                  <TableRow className="border-frestea-purple/30">
                    <TableHead className="text-purple-300">Nama</TableHead>
                    <TableHead className="text-purple-300">URL</TableHead>
                    <TableHead className="text-purple-300">Durasi</TableHead>
                    <TableHead className="text-purple-300">Status</TableHead>
                    <TableHead className="text-purple-300 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {berbukaVideos.map((video) => (
                    <TableRow key={video.id} className="border-frestea-purple/30">
                      <TableCell className="text-white">{video.name}</TableCell>
                      <TableCell className="text-purple-300 max-w-[200px] truncate">{video.url}</TableCell>
                      <TableCell className="text-white">{video.duration_seconds}s</TableCell>
                      <TableCell>
                        <Switch
                          checked={video.is_active}
                          onCheckedChange={() => handleToggleBerbuka(video)}
                          data-testid={`berbuka-toggle-${video.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setEditingBerbuka(video)}
                              data-testid={`edit-berbuka-${video.id}`}
                            >
                              <Edit className="w-4 h-4 text-purple-400" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-frestea-surface border-frestea-purple/30">
                            <DialogHeader>
                              <DialogTitle className="text-white">Edit Video Berbuka</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-purple-300">Nama</Label>
                                <Input
                                  value={editingBerbuka?.name || ""}
                                  onChange={(e) => setEditingBerbuka(prev => ({ ...prev, name: e.target.value }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                              <div>
                                <Label className="text-purple-300">URL</Label>
                                <Input
                                  value={editingBerbuka?.url || ""}
                                  onChange={(e) => setEditingBerbuka(prev => ({ ...prev, url: e.target.value }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                              <div>
                                <Label className="text-purple-300">Durasi (detik)</Label>
                                <Input
                                  type="number"
                                  value={editingBerbuka?.duration_seconds || 300}
                                  onChange={(e) => setEditingBerbuka(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="ghost">Batal</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={handleUpdateBerbuka} className="bg-frestea-green text-black">Simpan</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteBerbuka(video.id)}
                          data-testid={`delete-berbuka-${video.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {berbukaVideos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-purple-400 py-8">
                        Belum ada video berbuka
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-frestea-gold" />
                Jadwal Waktu Sholat
              </CardTitle>
              <CardDescription className="text-purple-300">
                Kelola jadwal waktu subuh dan maghrib untuk countdown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Schedule Form */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-frestea-dark/50 rounded-lg">
                <div>
                  <Label className="text-purple-300">Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-frestea-surface border-frestea-purple/30"
                        data-testid="schedule-date-picker"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd/MM/yy") : "Pilih"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-frestea-surface border-frestea-purple/30">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-purple-300 flex items-center gap-1">
                    <Sunrise className="w-3 h-3" /> Subuh
                  </Label>
                  <Input
                    type="time"
                    value={newSchedule.subuh_time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, subuh_time: e.target.value }))}
                    className="bg-frestea-surface border-frestea-purple/30"
                    data-testid="schedule-subuh-input"
                  />
                </div>
                <div>
                  <Label className="text-purple-300 flex items-center gap-1">
                    <Sunset className="w-3 h-3" /> Maghrib
                  </Label>
                  <Input
                    type="time"
                    value={newSchedule.maghrib_time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, maghrib_time: e.target.value }))}
                    className="bg-frestea-surface border-frestea-purple/30"
                    data-testid="schedule-maghrib-input"
                  />
                </div>
                <div>
                  <Label className="text-purple-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Wilayah
                  </Label>
                  <Input
                    placeholder="Bekasi"
                    value={newSchedule.location}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-frestea-surface border-frestea-purple/30"
                    data-testid="schedule-location-input"
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button onClick={handleAddSchedule} className="w-full bg-frestea-gold text-black hover:bg-frestea-gold/80" data-testid="add-schedule-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Jadwal
                  </Button>
                </div>
              </div>

              {/* Schedule List */}
              <Table>
                <TableHeader>
                  <TableRow className="border-frestea-purple/30">
                    <TableHead className="text-purple-300">Tanggal</TableHead>
                    <TableHead className="text-purple-300">Subuh</TableHead>
                    <TableHead className="text-purple-300">Maghrib</TableHead>
                    <TableHead className="text-purple-300">Wilayah</TableHead>
                    <TableHead className="text-purple-300 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id} className="border-frestea-purple/30">
                      <TableCell className="text-white">{schedule.date}</TableCell>
                      <TableCell className="text-purple-300 font-mono">{schedule.subuh_time || "-"}</TableCell>
                      <TableCell className="text-frestea-gold font-mono">{schedule.maghrib_time}</TableCell>
                      <TableCell className="text-purple-300">{schedule.location}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setEditingSchedule(schedule)}
                              data-testid={`edit-schedule-${schedule.id}`}
                            >
                              <Edit className="w-4 h-4 text-purple-400" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-frestea-surface border-frestea-purple/30">
                            <DialogHeader>
                              <DialogTitle className="text-white">Edit Jadwal</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-purple-300">Tanggal</Label>
                                <Input
                                  value={editingSchedule?.date || ""}
                                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, date: e.target.value }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                              <div>
                                <Label className="text-purple-300">Waktu Subuh</Label>
                                <Input
                                  type="time"
                                  value={editingSchedule?.subuh_time || ""}
                                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, subuh_time: e.target.value }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                              <div>
                                <Label className="text-purple-300">Waktu Maghrib</Label>
                                <Input
                                  type="time"
                                  value={editingSchedule?.maghrib_time || ""}
                                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, maghrib_time: e.target.value }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                              <div>
                                <Label className="text-purple-300">Wilayah</Label>
                                <Input
                                  value={editingSchedule?.location || ""}
                                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, location: e.target.value }))}
                                  className="bg-frestea-dark border-frestea-purple/30"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="ghost">Batal</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={handleUpdateSchedule} className="bg-frestea-gold text-black">Simpan</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          data-testid={`delete-schedule-${schedule.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {schedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-purple-400 py-8">
                        Belum ada jadwal waktu sholat
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Change Password Card */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-400" />
                  Ubah Password
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Ubah password akun Anda sendiri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-purple-300">Password Lama</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={changePassword.current_password}
                    onChange={(e) => setChangePassword(prev => ({ ...prev, current_password: e.target.value }))}
                    className="bg-frestea-dark border-frestea-purple/30"
                    data-testid="current-password-input"
                  />
                </div>
                <div>
                  <Label className="text-purple-300">Password Baru</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={changePassword.new_password}
                    onChange={(e) => setChangePassword(prev => ({ ...prev, new_password: e.target.value }))}
                    className="bg-frestea-dark border-frestea-purple/30"
                    data-testid="new-password-input"
                  />
                </div>
                <div>
                  <Label className="text-purple-300">Konfirmasi Password Baru</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={changePassword.confirm_password}
                    onChange={(e) => setChangePassword(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="bg-frestea-dark border-frestea-purple/30"
                    data-testid="confirm-new-password-input"
                  />
                </div>
                <Button onClick={handleChangePassword} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="change-password-btn">
                  <Key className="w-4 h-4 mr-2" />
                  Ubah Password
                </Button>
              </CardContent>
            </Card>

            {/* Add New User Card */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-green-400" />
                  Tambah User Baru
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Tambahkan admin user baru
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-purple-300">Username</Label>
                  <Input
                    placeholder="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-frestea-dark border-frestea-purple/30"
                    data-testid="new-user-username-input"
                  />
                </div>
                <div>
                  <Label className="text-purple-300">Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-frestea-dark border-frestea-purple/30"
                    data-testid="new-user-password-input"
                  />
                </div>
                <Button onClick={handleAddUser} className="w-full bg-frestea-green text-black hover:bg-frestea-green/80" data-testid="add-user-btn">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Tambah User
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          <Card className="admin-card mt-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Daftar User
              </CardTitle>
              <CardDescription className="text-purple-300">
                Kelola semua admin user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-frestea-purple/30">
                    <TableHead className="text-purple-300">Username</TableHead>
                    <TableHead className="text-purple-300">Dibuat</TableHead>
                    <TableHead className="text-purple-300 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-frestea-purple/30">
                      <TableCell className="text-white font-medium">
                        {user.username}
                        {user.username === username && (
                          <span className="ml-2 text-xs bg-frestea-green/20 text-frestea-green px-2 py-1 rounded">
                            Anda
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-purple-300">
                        {new Date(user.created_at).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {user.username !== username && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setResetPassword({ user_id: user.id, password: "" })}
                                  data-testid={`reset-password-${user.id}`}
                                >
                                  <Key className="w-4 h-4 text-blue-400" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-frestea-surface border-frestea-purple/30">
                                <DialogHeader>
                                  <DialogTitle className="text-white">Reset Password - {user.username}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-purple-300">Password Baru</Label>
                                    <Input
                                      type="password"
                                      placeholder="••••••••"
                                      value={resetPassword.password}
                                      onChange={(e) => setResetPassword(prev => ({ ...prev, password: e.target.value }))}
                                      className="bg-frestea-dark border-frestea-purple/30"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button variant="ghost">Batal</Button>
                                  </DialogClose>
                                  <DialogClose asChild>
                                    <Button onClick={handleResetPassword} className="bg-blue-600">Reset Password</Button>
                                  </DialogClose>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteUser(user.id)}
                              data-testid={`delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-purple-400 py-8">
                        Belum ada user
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
