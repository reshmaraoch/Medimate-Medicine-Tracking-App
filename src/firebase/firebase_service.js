import { collection, addDoc, getDoc, getDocs, doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/firebase_conf";

const getUserID = () => {
    const uid = auth.currentUser?.uid;
    if(!uid){
        throw new Error("No user logged in");
    }
    return uid;
}

export const getMedsCollectionRef = () => {
    const uid = getUserID();
    return collection(db, "users", uid, "medication");
}

export const saveMeds = async (data) => {
    const colRef = getMedsCollectionRef();

    const payload = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    return await addDoc(colRef, payload);
}

export const getAllMeds = async () => {
    const colRef = getMedsCollectionRef();
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
    }));
}

export const updateMeds = async (id, data) => {
    const uid = getUserID();
    const docRef = doc(db, "users", uid, "medication", id);
    return await updateDoc(docRef, {
        ...data, updatedAt: serverTimestamp(),
    })
}

export const getMedsById = async (id) => {
    const uid = auth.currentUser?.uid;
    if(!uid) throw Error("User not logged in");

    const docRef = doc(db, "users", uid, "medication", id);
    const snapshot = await getDoc(docRef);
    if(!snapshot.exists()) throw Error("Medication not found");

    return {id: snapshot.id, ...snapshot.data()};   
}

export const deleteMedById = async (id) => {
    const uid = auth.currentUser?.uid
    if(!uid) throw Error("User is not logged in")

    try{
        const docRef = doc(db, "users", uid, "medication", id);
        await deleteDoc(docRef);
        return { success: true };
    } catch (err) {
        console.error("Could not delete medicine", err)
        return { success: false, error: err };
    }

}

