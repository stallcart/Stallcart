import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1bnXrYuwJQ-prQN1hsPYwr_oR2WwghjU",
    authDomain: "stallcart-2baa5.firebaseapp.com",
    projectId: "stallcart-2baa5",
    appId: "1:795612911191:web:c5ca9a3f1cf8872d0cf512"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Page elements
const tabJoin = document.getElementById('tabJoin');
const tabStatus = document.getElementById('tabStatus');
const joinSection = document.getElementById('joinSection');
const statusSection = document.getElementById('statusSection');
const joinForm = document.getElementById('joinForm');
const btnTrack = document.getElementById('btnTrack');
const tasksList = document.getElementById('tasksList');

// Tab Switching logic
tabJoin.onclick = () => { tabJoin.classList.add('active'); tabStatus.classList.remove('active'); joinSection.style.display = 'block'; statusSection.style.display = 'none'; };
tabStatus.onclick = () => { tabStatus.classList.add('active'); tabJoin.classList.remove('active'); statusSection.style.display = 'block'; joinSection.style.display = 'none'; };

// Handle Join Form Submission
joinForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('joinName').value;
    const phone = document.getElementById('joinPhone').value;
    const address = document.getElementById('joinAddress').value;
    const idCard = document.getElementById('joinId').value;
    
    try {
        await addDoc(collection(db, "deliveryBoys"), { 
            name, phone, address, idCard, createdAt: new Date().toISOString(), status: 'Pending', deliveredCount: 0 
        });
        
        // Auto-switch to task tab instantly without popup
        document.getElementById('trackPhone').value = phone;
        tabStatus.click();
        btnTrack.click();
        joinForm.reset();
    } catch (err) { alert('Error joining network: ' + err.message); }
};

// Track Tasks Logic
btnTrack.onclick = async () => {
    const phone = document.getElementById('trackPhone').value.trim();
    if (!phone) { alert("Enter your registered phone."); return; }
    
    tasksList.innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner" style="margin:0 auto;"></div><p>Searching for assignments...</p></div>';
    
    const q = query(collection(db, "orders"), where("deliveryBoyPhone", "==", phone));
    onSnapshot(q, (snap) => {
        const orders = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
        if (orders.length === 0) {
            tasksList.innerHTML = '<div style="text-align:center; padding:40px; color:#999;"><i class="fa fa-info-circle"></i> No task assigned yet. Contact Stallcart Support.</div>';
            return;
        }
        
        tasksList.innerHTML = orders.reverse().map(o => `
            <div class="order-card-d">
                <div class="order-d-header">
                    <div>
                        <span style="font-size:11px; color:#888; font-weight:600;">ORDER ID: #${o.id.substring(0,8).toUpperCase()}</span>
                        <h4 style="margin-top:4px; color:#212121; font-size:16px;">${o.productTitle}</h4>
                    </div>
                    <span class="status-badge ${o.status === 'Out for Delivery' ? 's-out' : (o.status === 'Delivered' ? 's-delivered' : '')}">${o.status}</span>
                </div>
                
                <div class="user-info-box">
                    <div style="font-weight:800; color:#2874f0; margin-bottom:8px;"><i class="fa fa-user"></i> ${o.userName || 'Customer'}</div>
                    
                    <a href="tel:${o.address?.phone || o.userPhone}" style="display:flex; align-items:center; gap:8px; color:#388e3c; text-decoration:none; font-weight:700; margin-bottom:12px; background:#e8f5e9; padding:8px 12px; border-radius:6px; width:fit-content;">
                        <i class="fa fa-phone"></i> ${o.address?.phone || o.userPhone || 'Call Customer'}
                    </a>

                    <div style="font-size:13px; color:#444; line-height:1.5; border-top:1px solid #eee; padding-top:10px;">
                        <strong style="display:block; font-size:11px; color:#888; text-transform:uppercase;">Shipping Location:</strong>
                        ${o.address?.address || 'N/A'}<br>
                        ${o.address?.city || ''}, ${o.address?.district || ''}<br>
                        ${o.address?.state || ''} - <strong>${o.address?.postalCode || ''}</strong>
                    </div>
                </div>

                ${o.status === 'Delivered' ? 
                    '<div style="text-align:center; padding:15px; background:#e8f5e9; color:#2e7d32; border-radius:10px; margin-top:15px; font-weight:700;"><i class="fa fa-check-circle"></i> DELIVERY COMPLETED</div>' 
                : `
                    <div style="margin-top:20px;">
                        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; background:#fff8e1; padding:12px; border-radius:8px; border:1px solid #ffe082;">
                            <input type="checkbox" style="width:18px; height:18px;" ${o.status === 'Out for Delivery' ? 'checked disabled' : ''} onchange="markOutForDelivery('${o.id}')"> 
                            <span style="font-weight:700; color:#f57f17;">START DELIVERY / OUT FOR DELIVERY</span>
                        </label>
                    </div>
                    
                    ${o.status === 'Out for Delivery' ? `
                        <div class="otp-input-area" style="flex-direction:column; align-items:stretch;">
                            <label style="font-size:12px; color:#666; font-weight:600;">ENTER 6-DIGIT CUSTOMER OTP</label>
                            <div style="display:flex; gap:10px;">
                                <input type="number" class="otp-input" placeholder="000000" id="otp_${o.id}" style="flex:1;">
                                <button class="btn-join" style="width:auto; padding:10px 20px; background:#388e3c; margin:0;" onclick="confirmDelivery('${o.id}', '${o.deliveryOtp}')">VERIFY</button>
                            </div>
                        </div>
                    ` : ''}
                `}
            </div>
        `).join('');
    });
};

window.markOutForDelivery = async (id) => {
    if(!confirm('Setting status to OUT FOR DELIVERY. Confirm?')) return;
    try {
        await updateDoc(doc(db, "orders", id), { status: 'Out for Delivery' });
        alert('Status Updated. Deliver safely!');
    } catch (e) { alert(e.message); }
};

window.confirmDelivery = async (id, correctOtp) => {
    const inputOtp = document.getElementById('otp_' + id).value;
    if (inputOtp != correctOtp) { alert('Invalid 6-Digit Code. Ask user for the correct OTP.'); return; }
    
    if(!confirm('Are you sure the order has been delivered successfully?')) return;
    
    try {
        await updateDoc(doc(db, "orders", id), { status: 'Delivered', deliveredAt: new Date().toISOString() });
        alert('Congratulations! Order Delivered Successfully.');
    } catch (e) { alert(e.message); }
};
