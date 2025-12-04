'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HoldToConfirm } from '@/components/ui/hold-toconfirm'
import { Input } from '@/components/ui/input'
import { Navigation, PhoneCall, Plus, Settings, Trash2, UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Drawer } from 'vaul'

interface EmergencyContact {
  id: string
  name: string
  phone: string
}

interface SOSDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userLocation: [number, number] | null
  onNavigateToPolice: () => void
  onFakeCall: () => void
}

export default function SOSDrawer({
  open,
  onOpenChange,
  userLocation,
  onNavigateToPolice,
  onFakeCall,
}: SOSDrawerProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [showContactDialog, setShowContactDialog] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '' })

  // Load contacts from localStorage
  useEffect(() => {
    const savedContacts = localStorage.getItem('emergency_contacts')
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts))
    }
  }, [])

  // Save contacts to localStorage
  const saveContacts = (updatedContacts: EmergencyContact[]) => {
    localStorage.setItem('emergency_contacts', JSON.stringify(updatedContacts))
    setContacts(updatedContacts)
  }

  // Get emergency number based on location
  const getEmergencyNumber = () => {
    // For now, default to French numbers
    // In production, use geolocation API to detect country
    return '17' // French police
  }

  // Send SMS alert to contacts
  const alertContacts = async () => {
    if (contacts.length === 0) {
      toast.error('No emergency contacts added', {
        description: 'Add contacts first to alert them',
      })
      return
    }

    if (!userLocation) {
      toast.error('Location not available', {
        description: 'Please enable location access',
      })
      return
    }

    const [lng, lat] = userLocation
    const googleMapsLink = `https://www.google.com/maps?q=${lat},${lng}`
    const message = `⚠️ I need help! Location: ${lat.toFixed(6)}, ${lng.toFixed(
      6
    )}, ${googleMapsLink}. Sent from Streetwise`

    // Create SMS links for each contact
    contacts.forEach((contact) => {
      const smsLink = `sms:${contact.phone}?body=${encodeURIComponent(message)}`
      window.open(smsLink, '_blank')
    })

    toast.success('Emergency alerts sent', {
      description: `Notified ${contacts.length} contact${contacts.length > 1 ? 's' : ''}`,
    })
    onOpenChange(false)
  }

  // Add new contact
  const addContact = () => {
    if (!newContact.name || !newContact.phone) {
      toast.error('Please fill in all fields')
      return
    }

    if (contacts.length >= 3) {
      toast.error('Maximum 3 emergency contacts allowed')
      return
    }

    const contact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContact.name,
      phone: newContact.phone,
    }

    saveContacts([...contacts, contact])
    setNewContact({ name: '', phone: '' })
    toast.success('Contact added')
  }

  // Delete contact
  const deleteContact = (id: string) => {
    saveContacts(contacts.filter((c) => c.id !== id))
    toast.success('Contact removed')
  }

  // Navigate to nearest police station
  const handleNavigateToPolice = () => {
    onNavigateToPolice()
    onOpenChange(false)
  }

  // Start fake call
  const handleFakeCall = () => {
    onFakeCall()
    onOpenChange(false)
  }

  // Call emergency services
  const callEmergency = () => {
    const number = getEmergencyNumber()
    window.location.href = `tel:${number}`
    onOpenChange(false)
  }

  return (
    <>
      <Drawer.Root open={open} onOpenChange={onOpenChange} modal={true}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Drawer.Content className="fixed flex flex-col bg-background rounded-t-[20px] bottom-0 left-0 right-0 max-h-[90%] z-50 border-t border-border">
            <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mt-3 mb-4" />

            <div className="flex flex-col px-5 pb-5 overflow-y-auto">
              <div className="space-y-4">
                {/* Call Emergency - Prominent button */}
                <HoldToConfirm
                  duration={2000}
                  size="lg"
                  onConfirm={callEmergency}
                  className="w-full h-16 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-xl shadow-md"
                  fillClassName="bg-red-800"
                  confirmedChildren={<>Calling...</>}
                >
                  Call Emergency Services ({getEmergencyNumber()})
                </HoldToConfirm>
                {/* Alert My Contacts or Add Contacts button */}
                {contacts.length > 0 ? (
                  <div className="space-y-2">
                    <Button
                      variant={'secondary'}
                      onClick={alertContacts}
                      className="w-full h-16 text-white text-base font-semibold rounded-xl shadow-md transition-all"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Alert My Contacts ({contacts.length})
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant={'secondary'}
                    onClick={() => setShowContactDialog(true)}
                    className="w-full h-16 text-white text-base font-semibold rounded-xl shadow-md transition-all"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add Emergency Contacts
                  </Button>
                )}

                {/* Navigate to Police and Fake Call - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleFakeCall}
                    className="h-24 bg-primary text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center p-3"
                  >
                    <PhoneCall className="h-6 w-6 mb-1.5" />
                    <span className="text-xs font-medium text-center">Fake Call</span>
                  </button>
                  <button
                    onClick={handleNavigateToPolice}
                    className="h-24 bg-primary text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center p-3"
                  >
                    <Navigation className="h-6 w-6 mb-1.5" />
                    <span className="text-xs font-medium text-center">Go to Police</span>
                  </button>
                </div>

                {contacts.length > 0 && (
                  <button
                    onClick={() => setShowContactDialog(true)}
                    className="w-full p-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4 inline mr-1" />
                    Manage Contacts
                  </button>
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Contact Management Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Emergency Contacts</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Contacts List */}
            {contacts.length > 0 && (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    </div>
                    <button
                      onClick={() => deleteContact(contact.id)}
                      className="p-2 hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Contact Form */}
            {contacts.length < 3 && (
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-sm font-medium"></h4>
                <Input
                  placeholder="Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
                <Input
                  placeholder="Phone number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  type="tel"
                />
                <Button
                  onClick={() => {
                    addContact()
                    if (newContact.name && newContact.phone) {
                      setShowContactDialog(false)
                    }
                  }}
                  className="w-full"
                  disabled={!newContact.name || !newContact.phone}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
