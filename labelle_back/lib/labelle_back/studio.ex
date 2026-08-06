defmodule LabelleBack.Studio do
  use Ash.Domain, otp_app: :labelle_back, extensions: [AshAdmin.Domain, AshJsonApi.Domain]

  admin do
    show? true
  end

  json_api do
    authorize? true

    routes do
      base_route "/clients", LabelleBack.Studio.Client do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/professionals", LabelleBack.Studio.Professional do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/professional_services", LabelleBack.Studio.ProfessionalService do
        get :read
        index :read
        post :create
        delete :destroy
      end

      base_route "/services", LabelleBack.Studio.Service do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/appointments", LabelleBack.Studio.Appointment do
        get :read
        index :read
        post :create
        post :book_online, route: "/book_online"
        patch :update
        patch :finalize, route: "/:id/finalize"
        patch :confirm, route: "/:id/confirm"
        patch :start, route: "/:id/start"
        patch :cancel, route: "/:id/cancel"
        patch :send_reminder, route: "/:id/send_reminder"
        delete :destroy
      end

      base_route "/appointment_services", LabelleBack.Studio.AppointmentService do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/client_reminders", LabelleBack.Studio.ClientReminder do
        get :read
        index :read
        patch :mark_sent, route: "/:id/mark_sent"
        patch :cancel, route: "/:id/cancel"
        patch :deliver, route: "/:id/deliver"
      end

      base_route "/products", LabelleBack.Studio.Product do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/promotions", LabelleBack.Studio.Promotion do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/transactions", LabelleBack.Studio.Transaction do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/payments", LabelleBack.Studio.Payment do
        get :read
        index :read
        post :create
        patch :update
        delete :destroy
      end

      base_route "/settings", LabelleBack.Studio.Settings do
        get :read, route: "/"
        patch :update, route: "/"
      end

      base_route "/whatsapp_connection", LabelleBack.Studio.WhatsAppConnection do
        route :get, "/status", :status
        route :get, "/qr_code", :qr_code
        route :post, "/logout", :logout
      end
    end
  end

  resources do
    resource LabelleBack.Studio.Client do
      # Lookup pela identidade unique_phone_normalized — o chamador
      # normaliza o telefone com NormalizePhone.normalize/1 antes.
      define :get_client_by_phone_normalized,
        action: :read,
        get_by: [:phone_normalized],
        not_found_error?: false
      define :upsert_client_from_booking, action: :upsert_from_booking, args: [:name, :phone]
    end

    resource LabelleBack.Studio.Professional
    resource LabelleBack.Studio.ProfessionalService
    resource LabelleBack.Studio.Service

    resource LabelleBack.Studio.Appointment do
      define :list_appointments_by_client_phone, action: :by_client_phone, args: [:phone]
      define :available_slots, action: :available_slots, args: [:professional_id, :date]
    end

    resource LabelleBack.Studio.AppointmentService
    resource LabelleBack.Studio.ClientReminder
    resource LabelleBack.Studio.Product
    resource LabelleBack.Studio.Promotion
    resource LabelleBack.Studio.Transaction
    resource LabelleBack.Studio.Payment

    resource LabelleBack.Studio.Settings do
      define :current_settings, action: :read
    end

    resource LabelleBack.Studio.WhatsAppConnection
  end
end
