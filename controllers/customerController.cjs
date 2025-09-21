const Customer = require("../models/customerModel.cjs");

function escRegex(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function makeNormName(fn,ln){
  return `${String(fn||"").trim()} ${String(ln||"").trim()}`
    .toLowerCase().replace(/\s+/g," ").trim();
}

async function getNextId(_req,res){
  try{
    const last = await Customer.find({}).sort({customerId:-1}).limit(1);
    let n = 0;
    if(last.length>0){
      const m = String(last[0].customerId).match(/(\d+)$/);
      if(m) n = parseInt(m[1],10);
    }
    res.json({ nextId: `C${String(n+1).padStart(3,"0")}` });
  }catch(e){ res.status(500).json({error:e.message}); }
}

async function add(req,res){
  try{
    const customerId = req.body.customerId;
    const firstname  = String(req.body.firstname||"").trim();
    const lastname   = String(req.body.lastname ||"").trim();
    const email      = String(req.body.email    ||"").trim();
    const phone      = String(req.body.phone    ||"").trim();
    const address    = String(req.body.address  ||"").trim();
    const preferredContact =
      (req.body.preferredContact==="phone") ? "phone" : "email";
    const senior = !!req.body.senior;
    const normName = makeNormName(firstname, lastname);

    console.log("➕ ADD attempt:", { customerId, firstname, lastname, normName });

    if(!customerId || !firstname || !lastname || !email || !phone){
      return res.status(400).json({ message:"Missing required fields" });
    }

    // 1) fast check by normName
    let exists = await Customer.findOne({ normName });

    // 2) fallback for old docs without normName
    if(!exists){
      const rxFirst = new RegExp(`^\\s*${escRegex(firstname)}\\s*$`,"i");
      const rxLast  = new RegExp(`^\\s*${escRegex(lastname)}\\s*$`,"i");
      exists = await Customer.findOne({
        $or:[
          { firstname: rxFirst, lastname: rxLast },
          { firstName: rxFirst, lastName: rxLast }
        ]
      });
    }

    if(exists && req.query.force!=="true"){
      console.log("🔎 DUPLICATE HIT:", normName);
      return res.status(409).json({
        code:"DUPLICATE_NAME",
        message:"A customer with this name already exists. Save anyway?"
      });
    }

    const doc = await Customer.create({
      customerId, firstname, lastname, firstName: firstname, lastName: lastname,
      email, phone, address, preferredContact, senior,
      classBalance: 0, normName
    });

    // optional notifier stub (safe if file missing)
    try{
      const notifier = require("../services/notifier.cjs");
      const msg = `Welcome to Yoga'Hom! Your customer id is ${doc.customerId}.`;
      await notifier.notifyCustomer(doc, msg);
    }catch(e){ console.warn("Notifier not configured:", e.message); }

    res.status(201).json({ message:"Customer added successfully", customer: doc });
  }catch(err){
    console.error("Error adding customer:", err.message);
    res.status(500).json({ message:"Failed to add customer", error: err.message });
  }
}

async function getCustomerIds(_req,res){
  try{
    const list = await Customer.find(
      {}, {customerId:1, firstname:1, lastname:1, firstName:1, lastName:1, _id:0}
    ).sort({customerId:1});
    res.json(list.map(c=>({
      customerId: c.customerId,
      firstname: c.firstname || c.firstName || "",
      lastname:  c.lastname  || c.lastName  || ""
    })));
  }catch(e){ res.status(400).json({error:e.message}); }
}

async function getCustomer(req,res){
  try{
    const id = req.query.customerId;
    if(!id) return res.status(400).json({message:"customerId query param required"});
    const doc = await Customer.findOne({ customerId:id });
    if(!doc) return res.status(404).json({message:"Customer not found"});
    res.json({
      customerId: doc.customerId,
      firstname: doc.firstname || doc.firstName || "",
      lastname:  doc.lastname  || doc.lastName  || "",
      address: doc.address || "", phone: doc.phone || "", email: doc.email || "",
      preferredContact: doc.preferredContact || "email",
      senior: !!doc.senior, classBalance: doc.classBalance ?? 0
    });
  }catch(e){ res.status(400).json({error:e.message}); }
}

async function deleteCustomer(req,res){
  try{
    const id = req.query.customerId;
    const result = await Customer.findOneAndDelete({ customerId:id });
    if(!result) return res.status(404).json({error:"Customer not found"});
    res.json({ message:"Customer deleted", customerId:id });
  }catch(err){ res.status(500).json({error:err.message}); }
}

module.exports = { getNextId, add, getCustomerIds, getCustomer, deleteCustomer };
