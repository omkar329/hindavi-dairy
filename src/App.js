import { db } from "./firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import React, { useState, useEffect } from "react";

// ===== TELEGRAM CONFIG =====
const TELEGRAM_BOT_TOKEN = process.env.REACT_APP_TELEGRAM_BOT_TOKEN || "8985832159:AAGZy1qOX-qQ6YfhiBnlDm7MvsU_w88UjpE";

const initialAdmins = [
  { id: "admin", pass: "dairy123", name: "मुख्य व्यवस्थापक" }
];

export default function HindaviDairy() {
  const [page, setPage] = useState("login"); 
  const [currentUser, setCurrentUser] = useState(null);
  
  const [adminsList, setAdminsList] = useState(initialAdmins);
  const [users, setUsers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [complaints, setComplaints] = useState([]); 
  
  const [adminTab, setAdminTab] = useState("dashboard");
  const [loginRole, setLoginRole] = useState("admin"); 
  
  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const [newAdminSetup, setNewAdminSetup] = useState({ id: "", pass: "", name: "" });
  const [newCollection, setNewCollection] = useState({ userId: "", session: "सकाळ", litres: "", fat: "", smf: "", rate: "" });
  const [newUser, setNewUser] = useState({ name: "", mobile: "", telegramChatId: "", village: "", type: "शेतकरी" });
  const [newComplaint, setNewComplaint] = useState(""); 
  const [editingUser, setEditingUser] = useState(null);
  
  const [selectedFarmerReport, setSelectedFarmerReport] = useState("");
  const [searchFarmer, setSearchFarmer] = useState("");
  const [notification, setNotification] = useState(null);

  // 🔥 फायरबेसमधून डेटा लोड करणे
  const fetchData = async () => {
    try {
      const farmersSnapshot = await getDocs(collection(db, "farmers"));
      const farmersData = farmersSnapshot.docs.map(doc => ({
        firebaseId: doc.id, ...doc.data()
      }));
      setUsers(farmersData);

      const collectionsSnapshot = await getDocs(collection(db, "collections"));
      const collectionsData = collectionsSnapshot.docs.map(doc => ({
        firebaseId: doc.id, ...doc.data()
      }));
      setCollections(collectionsData);

      const adminsSnapshot = await getDocs(collection(db, "admins"));
      const adminsData = adminsSnapshot.docs.map(doc => ({
        firebaseId: doc.id, ...doc.data()
      }));
      setAdminsList([...initialAdmins, ...adminsData]);

      const complaintsSnapshot = await getDocs(collection(db, "complaints"));
      const complaintsData = complaintsSnapshot.docs.map(doc => ({
        firebaseId: doc.id, ...doc.data()
      }));
      setComplaints(complaintsData);

    } catch (error) {
      console.error("डेटा लोड करताना एरर आली:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]); 

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const liveAmount = Math.round((parseFloat(newCollection.litres) || 0) * (parseFloat(newCollection.rate) || 0));

  const sendTelegramNotification = async (chatId, text) => {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") return;
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
      });
    } catch (error) {
      console.error("Telegram error:", error);
    }
  };

  const handleLogin = () => {
    if (loginRole === "admin") {
      const foundAdmin = adminsList.find(a => String(a.id) === String(loginId) && String(a.pass) === String(loginPass));
      if (foundAdmin) {
        setCurrentUser({ role: "admin", name: foundAdmin.name, id: foundAdmin.id });
        setPage("admin");
        setLoginError("");
      } else {
        setLoginError("चुकीचा Admin ID किंवा पासवर्ड");
      }
    } else if (loginRole === "user") {
      const user = users.find(u => String(u.mobile) === String(loginId));
      if (user && loginPass === "1234") {
        setCurrentUser({ 
          role: "user", 
          ...user,
          id: user.firebaseId || user.id || String(Date.now())
        });
        setPage("user");
        setLoginError("");
      } else {
        setLoginError("मोबाईल नंबर किंवा पासवर्ड चुकीचा");
      }
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminSetup.id || !newAdminSetup.pass || !newAdminSetup.name) {
      showNotif("कृपया सर्व माहिती भरा", "error"); return;
    }
    if (adminsList.some(a => String(a.id) === String(newAdminSetup.id))) {
      showNotif("या ID चा Admin आधीपासूनच अस्तित्वात आहे!", "error"); return;
    }
    await addDoc(collection(db, "admins"), newAdminSetup);
    showNotif(`नवीन Admin '${newAdminSetup.name}' यशस्वीरित्या जोडला!`);
    setNewAdminSetup({ id: "", pass: "", name: "" });
    fetchData();
  };

  const handleDeleteAdmin = async (firebaseId) => {
    if(!firebaseId) {
      alert("मुख्य व्यवस्थापकाला (Default Admin) डिलीट करता येत नाही!");
      return;
    }
    if (window.confirm("तुम्हाला खात्री आहे की हा ॲडमीन डिलीट करायचा आहे?")) {
      await deleteDoc(doc(db, "admins", firebaseId));
      showNotif("ॲडमीन यशस्वीरित्या डिलीट केला ❌");
      fetchData();
    }
  };

  // ===== दूध संकलन नोंदणी =====
  const handleAddCollection = async () => {
    if (!newCollection.userId || !newCollection.litres || !newCollection.rate) {
      showNotif("शेतकरी/कंपनी, लिटर आणि दर भरणे अनिवार्य आहे", "error"); return;
    }

    const user = users.find(u => String(u.firebaseId || u.id) === String(newCollection.userId));
    if (!user) {
      showNotif("निवडलेला शेतकरी/कंपनी सिस्टीममध्ये सापडली नाही!", "error"); return;
    }

    const litres = parseFloat(newCollection.litres);
    const rate = parseFloat(newCollection.rate);
    const amount = Math.round(litres * rate);

    const coll = {
      id: String(Date.now()),
      userId: String(user.firebaseId || user.id),
      userName: user.name, 
      date: new Date().toISOString().split("T")[0],
      session: newCollection.session,
      litres, fat: parseFloat(newCollection.fat) || 0, smf: parseFloat(newCollection.smf) || 0, rate, amount,
    };
    
    await addDoc(collection(db, "collections"), coll);

    if (user.telegramChatId) {
      const receipt = `🥛 *दूध संकलन पावती - हिंदवी डेअरी* \n\nदिनांक: ${coll.date} (${coll.session})\nग्राहक/कंपनी: ${coll.userName}\nदूध: ${coll.litres} लि.\nदर: ₹${coll.rate}/लि.\n*एकूण रक्कम: ₹${coll.amount}*\n\nधन्यवाद! 🙏`;
      sendTelegramNotification(user.telegramChatId, receipt);
    }

    setNewCollection({ userId: "", session: "सकाळ", litres: "", fat: "", smf: "", rate: "" });
    showNotif("संकलन नोंदवून पावती पाठवली! ✅");
    fetchData();
  };

  const handleDeleteCollection = async (firebaseId) => {
    if (window.confirm("तुम्हाला खात्री आहे की ही नोंद इतिहासामधून डिलीट करायची आहे?")) {
      await deleteDoc(doc(db, "collections", firebaseId));
      showNotif("नोंद डिलीट केली ❌");
      fetchData();
    }
  };

  // ===== शेतकरी जोडा / दुरुस्त करा =====
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.mobile || !newUser.village) {
      showNotif("सर्व माहिती भरा", "error"); return;
    }
    
    if (editingUser) {
      try {
        const userDocRef = doc(db, "farmers", editingUser.firebaseId);
        await updateDoc(userDocRef, {
          name: newUser.name, mobile: newUser.mobile,
          telegramChatId: newUser.telegramChatId, village: newUser.village, type: newUser.type
        });
        showNotif("माहिती अद्ययावत केली ✅");
        setEditingUser(null);
        fetchData();
      } catch (error) {
        showNotif("माहिती अपडेट झाली नाही", "error");
      }
    } else {
      const uniqueId = String(Date.now()); 
      const user = {
        id: uniqueId, ...newUser,
        joined: new Date().toISOString().split("T")[0],
      };
      await addDoc(collection(db, "farmers"), user);
      showNotif(`नवीन ${newUser.type} जोडला गेला ✅`);
      fetchData();
    }
    setNewUser({ name: "", mobile: "", telegramChatId: "", village: "", type: "शेतकरी" });
  };

  const handleDeleteUser = async (firebaseId) => {
    if (window.confirm("तुम्हाला हा शेतकरी डिलीट करायचा आहे का? यामुळे त्यांचा डेटा निघून जाईल.")) {
      await deleteDoc(doc(db, "farmers", firebaseId));
      showNotif("शेतकरी डिलीट केला ❌");
      fetchData();
    }
  };

  // युझर पॅनेलमधून तक्रार दाखल करणे
  const handleSubmitComplaint = async () => {
    if (!newComplaint.trim()) {
      alert("कृपया तक्रार टाईप करा"); return;
    }
    const complaintData = {
      userId: currentUser.id || "unknown_user",
      userName: currentUser.name || "अनामिक शेतकरी",
      userMobile: currentUser.mobile || "",
      text: newComplaint,
      date: new Date().toISOString().split("T")[0]
    };
    await addDoc(collection(db, "complaints"), complaintData);
    showNotif("तकरीर यशस्वीरित्या नोंदवली. व्यवस्थापक लवकरच संपर्क करतील! ✅");
    setNewComplaint("");
    fetchData();
  };

  const handleDeleteComplaint = async (firebaseId) => {
    await deleteDoc(doc(db, "complaints", firebaseId));
    showNotif("तक्रार हटवली ❌");
    fetchData();
  };

  const handleEditUser = (u) => {
    setEditingUser(u);
    setNewUser({ name: u.name, mobile: u.mobile, telegramChatId: u.telegramChatId || "", village: u.village, type: u.type || "शेतकरी" });
  };

  const getFarmer10DayRecords = (farmerId) => {
    if (!farmerId) return [];
    return collections.filter(c => String(c.userId) === String(farmerId)).slice(-10);
  };

  // 📥 सामायिक CSV डाऊनलोड फंक्शन (ॲडमीन आणि शेतकरी दोघेही वापरू शकतात)
  const downloadCSVReport = (farmerId) => {
    const records = getFarmer10DayRecords(farmerId);
    const farmer = users.find(u => String(u.firebaseId || u.id) === String(farmerId));
    if (records.length === 0) {
      alert("डाऊनलोड करण्यासाठी कोणतीही नोंद उपलब्ध नाही!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `नाव: ${farmer?.name || 'शेतकरी'}, गाव/पत्ता: ${farmer?.village || '-'}\n`;
    csvContent += "तारीख,सत्र,दूध (लि.),फॅट (%),SMF (%),दर (रु),एकूण रक्कम (रु)\n";
    records.forEach(r => { csvContent += `${r.date},${r.session},${r.litres},${r.fat},${r.smf},${r.rate},${r.amount}\n`; });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `रिपोर्ट_${farmer?.name || 'दूध_संकलन'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const send10DayReportTelegram = (farmerId) => {
    const records = getFarmer10DayRecords(farmerId);
    const farmer = users.find(u => String(u.firebaseId || u.id) === String(farmerId));
    if (!farmer || !farmer.telegramChatId || records.length === 0) return;

    let totalLitre = records.reduce((acc, item) => acc + item.litres, 0);
    let totalAmt = records.reduce((acc, item) => acc + item.amount, 0);

    let reportText = `📜 *१०-दिवसीय अहवाल - हिंदवी डेअरी* \n\n*नाव:* ${farmer.name}\n`;
    records.forEach(r => { reportText += `📅 ${r.date} (${r.session}) 🥛 ${r.litres} लि. | *₹${r.amount}*\n`; });
    reportText += `📊 *एकूण दूध:* ${totalLitre} लि. | *एकूण पेमेंट:* ₹${totalAmt}`;

    sendTelegramNotification(farmer.telegramChatId, reportText);
    showNotif("रिपोर्ट टेलिग्रामवर पाठवला! 📤");
  };

  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchFarmer.toLowerCase()) || u.village?.toLowerCase().includes(searchFarmer.toLowerCase()));

  const S = {
    app: { minHeight: "100vh", background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)", fontFamily: "'Noto Sans Devanagari', sans-serif", color: "#fff" },
    card: { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", borderRadius: 16, padding: "20px", border: "1px solid rgba(255,255,255,0.12)", marginBottom: 16 },
    btn: (color = "#f7b731") => ({ background: color, color: color === "#f7b731" ? "#1a1a1a" : "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }),
    input: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "10px 14px", color: "#fff", width: "100%", boxSizing: "border-box" },
    label: { fontSize: 13, color: "#aad4f5", marginBottom: 4, display: "block" },
    tab: (active) => ({ padding: "10px 18px", borderRadius: 10, border: "none", background: active ? "#f7b731" : "rgba(255,255,255,0.08)", color: active ? "#1a1a1a" : "#ccc", cursor: "pointer", whiteSpace: "nowrap" }),
    header: { background: "rgba(0,0,0,0.35)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)" },
    delBtn: { background: "#e74c3c", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, marginLeft: 6 }
  };

  // ===== LOGIN SCREEN =====
  if (page === "login") return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 10 }}>🐄</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f7b731", margin: "0 0 4px" }}>हिंदवी दूध संकलन केंद्र</h1>
        <p style={{ color: "#aad4f5", fontSize: 14, marginBottom: 28 }}>चिंचोली</p>
        
        <div style={S.card}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => setLoginRole("admin")} style={{ ...S.tab(loginRole === "admin"), flex: 1 }}>⚙️ व्यवस्थापक</button>
            <button onClick={() => setLoginRole("user")} style={{ ...S.tab(loginRole === "user"), flex: 1 }}>👨‍🌾 युझर पॅनेल</button>
          </div>
          <div style={{ marginBottom: 14, textAlign: "left" }}>
            <label style={S.label}>{loginRole === "admin" ? "Admin ID" : "📱 मोबाईल नंबर"}</label>
            <input style={S.input} value={loginId} onChange={e => setLoginId(e.target.value)} placeholder={loginRole === "admin" ? "admin" : "9876543210"} />
          </div>
          <div style={{ marginBottom: 20, textAlign: "left" }}>
            <label style={S.label}>🔒 पासवर्ड</label>
            <input type="password" style={S.input} value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••" />
          </div>
          {loginError && <div style={{ color: "#ff6b6b", marginBottom: 12 }}>{loginError}</div>}
          <button onClick={handleLogin} style={{ ...S.btn(), width: "100%" }}>🚀 लॉग इन करा</button>
        </div>
      </div>
    </div>
  );

  // ===== ADMIN PANEL =====
  if (page === "admin") {
    const tabs = [
      { key: "dashboard", label: "📊 डॅशबोर्ड" },
      { key: "collection", label: "🥛 दूध संकलन" },
      { key: "report10", label: "🧾 १०-दिवस रिपोर्ट" },
      { key: "users", label: "👥 शेतकरी/कंपनी" },
      { key: "complaints", label: `⚠️ तक्रारी (${complaints.length})` }, 
      { key: "admins", label: "⚙️ ॲडमीन व्यवस्थापन" }
    ];

    return (
      <div style={S.app}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet" />
        {notification && <div style={{ position: "fixed", top: 20, right: 20, background: "#27ae60", color: "#fff", padding: "12px 20px", borderRadius: 12, zIndex: 999 }}>{notification.msg}</div>}
        <div style={S.header}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#f7b731" }}>🐄 हिंदवी दूध संकलन केंद्र</div>
            <div style={{ fontSize: 11, color: "#aaa" }}> व्यवस्थापक: {currentUser?.name}</div>
          </div>
          <button onClick={() => setPage("login")} style={S.btn("#e74c3c")}>🚪 बाहेर</button>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "14px 16px", overflowX: "auto" }}>
          {tabs.map(t => <button key={t.key} onClick={() => setAdminTab(t.key)} style={S.tab(adminTab === t.key)}>{t.label}</button>)}
        </div>

        <div style={{ padding: "0 16px 80px" }}>
          {/* DASHBOARD */}
          {adminTab === "dashboard" && (
            <div style={S.card}>
              <h3>📊 आजची आकडेवारी</h3>
              <p>एकूण शेतकरी व कंपन्या संख्या: <b>{users.length}</b></p>
              <p>एकूण दूध संकलन नोंदी: <b>{collections.length}</b></p>
              <p>प्रलंबित तक्रारी: <b style={{ color: complaints.length > 0 ? "#ff6b6b" : "#fff" }}>{complaints.length}</b></p>
            </div>
          )}

          {/* MILK COLLECTION */}
          {adminTab === "collection" && (
            <div style={S.card}>
              <h3>🥛 नवीन दूध संकलन नोंदणी</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <select style={S.input} value={newCollection.userId} onChange={e => setNewCollection({ ...newCollection, userId: e.target.value })}>
                    <option value="">-- शेतकरी/कंपनी निवडा --</option>
                    {users.map(u => (
                      <option key={u.firebaseId || u.id} value={String(u.firebaseId || u.id)} style={{ color: '#000' }}>
                        [{u.type}] {u.name} ({u.village})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="number" style={S.input} placeholder="दूध लिटर" value={newCollection.litres} onChange={e => setNewCollection({ ...newCollection, litres: e.target.value })} />
                  <input type="number" style={S.input} placeholder="दर (Rate)" value={newCollection.rate} onChange={e => setNewCollection({ ...newCollection, rate: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="number" style={S.input} placeholder="फॅट %" value={newCollection.fat} onChange={e => setNewCollection({ ...newCollection, fat: e.target.value })} />
                  <input type="number" style={S.input} placeholder="SMF %" value={newCollection.smf} onChange={e => setNewCollection({ ...newCollection, smf: e.target.value })} />
                </div>
                
                {liveAmount > 0 && (
                  <div style={{ background: "rgba(46, 204, 113, 0.15)", border: "1px dashed #2ecc71", padding: 10, borderRadius: 10, textAlign: "center", color: "#2ecc71", fontWeight: "bold" }}>
                    📊 एकूण अंदाजे रक्कम: ₹{liveAmount}
                  </div>
                )}

                <button onClick={handleAddCollection} style={S.btn()}>✅ संकलन जतन करा</button>
              </div>
            </div>
          )}

          {/* 10-DAY REPORT */}
          {adminTab === "report10" && (
            <div style={S.card}>
              <h3>🧾 १०-दिवसीय रिपोर्ट आणि इतिहास व्यवस्थापन</h3>
              <select style={{ ...S.input, marginBottom: 16 }} value={selectedFarmerReport} onChange={e => setSelectedFarmerReport(e.target.value)}>
                <option value="">-- निवडा --</option>
                {users.map(u => <option key={u.firebaseId || u.id} value={u.firebaseId || u.id} style={{ color: '#000' }}>{u.name} ({u.type})</option>)}
              </select>

              {selectedFarmerReport && (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <button onClick={() => downloadCSVReport(selectedFarmerReport)} style={S.btn("#3498db")}>📥 CSV डाउनलोड</button>
                    <button onClick={() => send10DayReportTelegram(selectedFarmerReport)} style={S.btn("#2ecc71")}>📤 टेलिग्राम</button>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: "#aad4f5", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>
                        <th style={{ padding: 6, textAlign: "left" }}>तारीख</th>
                        <th style={{ padding: 6, textAlign: "left" }}>दूध</th>
                        <th style={{ padding: 6, textAlign: "left" }}>रक्कम</th>
                        <th style={{ padding: 6, textAlign: "center" }}>ॲक्शन</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFarmer10DayRecords(selectedFarmerReport).map(r => (
                        <tr key={r.firebaseId || r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <td style={{ padding: 6 }}>{r.date}</td>
                          <td style={{ padding: 6 }}>{r.litres} लि.</td>
                          <td style={{ padding: 6 }}>₹{r.amount}</td>
                          <td style={{ padding: 6, textAlign: "center" }}>
                            <button onClick={() => handleDeleteCollection(r.firebaseId)} style={S.delBtn}>🗑️ डिलीट</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* USERS MANAGEMENT */}
          {adminTab === "users" && (
            <div style={S.card}>
              <h3>👥 शेतकरी आणि कंपनी व्यवस्थापन</h3>
              <div style={{ display: "grid", gap: 12, marginBottom: 20, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10 }}>
                <input style={S.input} placeholder="नाव" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                <input style={S.input} placeholder="मोबाईल" value={newUser.mobile} onChange={e => setNewUser({ ...newUser, mobile: e.target.value })} />
                <input style={S.input} placeholder="गाव" value={newUser.village} onChange={e => setNewUser({ ...newUser, village: e.target.value })} />
                <button onClick={handleAddUser} style={S.btn("#2ecc71")}>{editingUser ? "🔄 अपडेट करा" : "💾 जतन करा"}</button>
              </div>

              <input style={{ ...S.input, marginBottom: 12 }} placeholder="🔍 शोधा..." value={searchFarmer} onChange={e => setSearchFarmer(e.target.value)} />

              {filteredUsers.map(u => (
                <div key={u.firebaseId || u.id} style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><b>{u.name}</b> ({u.village})</div>
                  <div>
                    <button onClick={() => handleEditUser(u)} style={{ ...S.btn(), padding: "5px 10px", fontSize: 12 }}>✏️</button>
                    <button onClick={() => handleDeleteUser(u.firebaseId)} style={S.delBtn}>🗑️ डिलीट</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMPLAINTS TAB FOR ADMIN */}
          {adminTab === "complaints" && (
            <div style={S.card}>
              <h3>⚠️ शेतकऱ्यांच्या तक्रारी / संदेश</h3>
              {complaints.length === 0 ? <p style={{ color: "#aaa" }}>सध्या कोणतीही तक्रार प्रलंबित नाही.</p> : 
                complaints.map(c => (
                  <div key={c.firebaseId || c.id} style={{ background: "rgba(231, 76, 60, 0.1)", border: "1px solid rgba(231, 76, 60, 0.3)", padding: 14, borderRadius: 10, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#aad4f5" }}>
                      <b>👤 {c.userName} ({c.userMobile})</b>
                      <span>📅 {c.date}</span>
                    </div>
                    <p style={{ margin: "8px 0", fontSize: 15, color: "#fff" }}>📝 {c.text}</p>
                    <button onClick={() => handleDeleteComplaint(c.firebaseId)} style={{ ...S.btn("#2ecc71"), padding: "4px 10px", fontSize: 12 }}>निवारण झाले (Delete) ✅</button>
                  </div>
                ))
              }
            </div>
          )}

          {/* ADMIN MANAGEMENT */}
          {adminTab === "admins" && (
            <div style={S.card}>
              <h3>⚙️ ॲडमीन व्यवस्थापन</h3>
              <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                <input style={S.input} placeholder="नाव" value={newAdminSetup.name} onChange={e => setNewAdminSetup({ ...newAdminSetup, name: e.target.value })} />
                <input style={S.input} placeholder="नवीन ID" value={newAdminSetup.id} onChange={e => setNewAdminSetup({ ...newAdminSetup, id: e.target.value })} />
                <input type="password" style={S.input} placeholder="पासवर्ड" value={newAdminSetup.pass} onChange={e => setNewAdminSetup({ ...newAdminSetup, pass: e.target.value })} />
                <button onClick={handleAddAdmin} style={S.btn("#2ecc71")}>➕ ॲडमीन जोडा</button>
              </div>
              <h4>सर्व सक्रिय ॲडमीन:</h4>
              {adminsList.map((a, idx) => (
                <div key={a.firebaseId || idx} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: 10, borderRadius: 8, marginBottom: 6 }}>
                  <span><b>{a.name}</b> (ID: {a.id})</span>
                  {a.firebaseId && <button onClick={() => handleDeleteAdmin(a.firebaseId)} style={S.delBtn}>🗑️ डिलीट</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== USER / FARMER SCREEN =====
  if (page === "user" && currentUser) {
    const userRecords = collections.filter(c => String(c.userId) === String(currentUser.id));
    // शेवटच्या १० नोंदी काढणे (रिपोर्टसाठी)
    const last10Records = userRecords.slice(-10);

    return (
      <div style={S.app}>
        {notification && <div style={{ position: "fixed", top: 20, right: 20, background: "#27ae60", color: "#fff", padding: "12px 20px", borderRadius: 12, zIndex: 999 }}>{notification.msg}</div>}
        <div style={S.header}>
          <div>
            <div style={{ fontWeight: 800 }}>👨‍🌾 {currentUser.name}</div>
            <div style={{ fontSize: 11, color: "#ccc" }}>गाव: {currentUser.village}</div>
          </div>
          <button onClick={() => setPage("login")} style={S.btn("#e74c3c")}>🚪 बाहेर</button>
        </div>
        
        <div style={{ padding: 16 }}>
          
          {/* 🟢 नवीन विभाग: युझर लेव्हल CSV रिपोर्ट डाऊनलोड */}
          <div style={S.card}>
            <h3 style={{ color: "#f7b731", marginTop: 0 }}>📊 तुमचा १०-दिवसांचा रिपोर्ट</h3>
            <p style={{ fontSize: 13, color: "#e0e0e0", marginBottom: 12 }}>तुमच्या शेवटच्या १० दिवसांच्या दूध संकलनाचा गोषवारा (CSV फाइल) मोबाईलमध्ये डाऊनलोड करा.</p>
            <button 
              onClick={() => downloadCSVReport(currentUser.id)} 
              style={S.btn("#3498db")}
              disabled={last10Records.length === 0}
            >
              📥 एक्सेल / CSV रिपोर्ट डाऊनलोड करा
            </button>
          </div>

          {/* WRITE COMPLAINT SECTION */}
          <div style={S.card}>
            <h3 style={{ color: "#aad4f5", marginTop: 0 }}>⚠️ तक्रार किंवा संदेश पाठवा</h3>
            <textarea style={{ ...S.input, height: 70, resize: "none", fontFamily: "inherit", marginBottom: 10 }} placeholder="तुमची तक्रार किंवा दुधाबद्दलचा प्रश्न येथे लिहा..." value={newComplaint} onChange={e => setNewComplaint(e.target.value)} />
            <button onClick={handleSubmitComplaint} style={S.btn("#e67e22")}>📤 तक्रार सबमिट करा</button>
          </div>

          {/* HISTORICAL RECORDS */}
          <div style={S.card}>
            <h3 style={{ color: '#aad4f5' }}>🥛 तुमचा दूध संकलन इतिहास</h3>
            {userRecords.length === 0 ? <p style={{ color: '#aaa' }}>कोणतीही नोंद उपलब्ध नाही.</p> : 
              userRecords.map(c => (
                <div key={c.firebaseId || c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "12px 0" }}>
                  <div><b>दिनांक:</b> {c.date} ({c.session})</div>
                  <div style={{ fontSize: 14, color: "#e0e0e0", margin: "4px 0" }}>
                    दूध: <b>{c.litres} लि.</b> | फॅट: {c.fat}% | दर: ₹{c.rate}
                  </div>
                  <div style={{ color: "#2ecc71", fontSize: 15 }}><b>एकूण रक्कम: ₹{c.amount}</b></div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  }
}