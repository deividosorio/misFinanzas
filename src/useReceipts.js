// src/useReceipts.js — Upload and manage receipt photos via Supabase Storage
import { useState } from 'react'
import { supabase } from './supabaseClient'

export function useReceipts() {
  const [uploading, setUploading] = useState(false)

  const uploadReceipt = async (file, txnId, familyId) => {
    if (!file) return null
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `receipts/${familyId}/${txnId}.${ext}`
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      return urlData.publicUrl
    } catch(e) {
      console.error('Receipt upload error:', e)
      return null
    } finally {
      setUploading(false)
    }
  }

  const getReceiptUrl = (txnId, familyId, ext = 'jpg') => {
    const path = `receipts/${familyId}/${txnId}.${ext}`
    const { data } = supabase.storage.from('receipts').getPublicUrl(path)
    return data?.publicUrl || null
  }

  const deleteReceipt = async (txnId, familyId) => {
    const paths = ['jpg','jpeg','png','webp'].map(e => `receipts/${familyId}/${txnId}.${e}`)
    await supabase.storage.from('receipts').remove(paths)
  }

  return { uploadReceipt, getReceiptUrl, deleteReceipt, uploading }
}
