import { useEffect, useState } from "react"
import { View, Text, Image, Keyboard, Alert } from "react-native"
import { router } from "expo-router"

import { MapPin, Calendar as IconCalendar, Settings2, UserRoundPlus, ArrowRight, AtSign } from "lucide-react-native"
import { type DateData } from "react-native-calendars"
import dayjs from "dayjs"

import { colors } from "@/styles/colors"
import { calendarUtils, type DatesSelected } from "@/utils/calendarUtils"
import { validateInput } from "@/utils/validateInput"

import { tripServer } from "@/server/trip-server"
import { tripStorage } from "@/storage/trip"

import { Input } from "@/components/input"
import { Button } from "@/components/button"
import { Modal } from "@/components/modal"
import { Calendar } from "@/components/calendar"
import { GuestEmail } from "@/components/email"
import { Loading } from "@/components/loading"

enum StepForm {
    TRIP_DETAILS = 1,
    ADD_EMAILS = 2
}

enum MODAL {
    NONE = 0,
    CALENDAR = 1,
    GUESTS = 2
}

export default function Index() {
    // LOADING
    const [ isCreatingTrip, setIsCreatingTrip ] = useState(false) // Await do request de createTrip
    const [ isGettingTrip, setIsGeetingTrip ] = useState(true) // Await de get trip id do Storage

    // DATA
    const [ stepForm, setStepForm ] = useState(StepForm.TRIP_DETAILS) // controlador da etapa do form

    const [ selectedDates, setSelectedDates ] = useState({} as DatesSelected) // O range de datas selecionadas do calendario
    const [ destination, setDestination ] = useState("") // Destino da viagem

    const [ emailToInvite, setEmailToInvite ] = useState("") // email atual sendo cadastrado
    const [ emailsToInvite, setEmailsToInvite ] = useState<string[]>([]) // Lista de emails para exibir e enviar

    // MODAL
    const [ showModal, setShownModal ] = useState(MODAL.NONE) // controlador da exibição do modal

    function handleNextStepForm() { // Lida com o precionar do botão continuar e confirmar viagem e faz e executa o CreateTrip
        if(destination.trim().length === 0 || !selectedDates.startsAt || !selectedDates.endsAt){
            return Alert.alert(
                "Detalhes da viagem",
                "Preencha todas as informações da viagem para seguir"
            )
        }

        if(destination.length < 4) {
            return Alert.alert(
                "Detalhes da viagem",
                "O destino deve ter pelo menos 4 caracteres."
            )
        }

        if(stepForm === StepForm.TRIP_DETAILS) {
            return setStepForm(StepForm.ADD_EMAILS)
        }

        Alert.alert("Nova Viagem", "Confirmar viagem?", [
            {
                text: "Não",
                style: "cancel"
            },
            {
                text: "Sim",
                onPress: createTrip,
            }
        ])
    }

    function handleRemoveEmail(emailToRemove: string) { // Ao clicar no X remove email
        setEmailsToInvite((prevState) => 
            prevState.filter(email => email !== emailToRemove)
        )
    }

    function handleSelectDate(selectedDay: DateData) { // Lida com a seleção de datas do calendario
        const dates = calendarUtils.orderStartsAtAndEndsAt({
            startsAt: selectedDates.startsAt,
            endsAt: selectedDates.endsAt,
            selectedDay
        })

        setSelectedDates(dates)
    }

    function handleAddEmail() { // Lida com a incerção de novos emails
        if(!validateInput.email(emailToInvite)) {
            return Alert.alert("Convidado", "E-mail inválido")
        }

        const emailAlredyExists = emailsToInvite.find(email => email === emailToInvite)

        if(emailAlredyExists) {
            return Alert.alert("Convidado", "E-mail já foi adicionado!")
        }

        setEmailsToInvite((prevState) => [...prevState, emailToInvite])
        setEmailToInvite("")
    }

    async function saveTrip(tripId: string) { // Salva a trip no Storage do dispositivo
        try {
            await tripStorage.save(tripId)
            router.navigate("/trip/" + tripId)
        } catch (err) {
            Alert.alert(
                "Salvar viagem",
                "Não foi possivel salvar o id da viagem no dispositivo."
            )
            console.log(err);
        }
    }

    async function createTrip() { // Faz o request para criar a trip
        try {
            setIsCreatingTrip(true)

            const newTrip = await tripServer.create({
                destination,
                starts_at: dayjs(selectedDates.startsAt?.dateString).toString(),
                ends_at: dayjs(selectedDates.endsAt?.dateString).toString(),
                emails_to_invite: emailsToInvite
            })

            Alert.alert("Nova viagem", "Viagem criada com sucesso!", [
                {
                    text: "OK. Continuar",
                    onPress: () => saveTrip(newTrip.tripId)
                },
            ])
        } catch (err) {
            console.log(err);
            setIsCreatingTrip(false)
        }
    }

    async function getTrip() { // pega os dados da Trip do Storage, se existir redireciona para /trip/[id]
        try {
            const tripID = await tripStorage.get()

            if(!tripID) {
                return setIsGeetingTrip(false)
            }

            const trip = await tripServer.getById(tripID)
            
            if(trip) {
                return router.navigate("/trip/" + trip.id)
            }
        } catch(err) {
            setIsGeetingTrip(false)
            console.log(err)
        }
    }

    useEffect(() => { // Get Trip depois dos componentes renderizados
        getTrip()
    }, [])

    if(isGettingTrip) {
        return <Loading />
    }

    /**
     * <A Logo do app />
     * <O Background do app />
     * <Titulo />
     * 
     * <Input Onde? e <Input Quando? />
     * 
     * if(stepForm=2) mostre <Input Convidados onPress -> <Modal de convidados/> />
     * 
     * <Button Next -> Confirm/>
     * 
     * <Direitos Autorais/>
     * 
     * <Modal selecionar datas
     * 
     * <Modal selecionar convidados
     */
    return (
        <View className="flex-1 items-center justify-center px-5">
            <Image 
                source={require("@/assets/logo.png")}
                className="h-8"
                resizeMode="contain"
            />

            <Image source={ require("@/assets/bg.png") } className="absolute"/>

            <Text className="text-zinc-400 font-regular text-center text-lg mt-3">
                Convide seus amigos e planeje sua{"\n"}próxima viagem
            </Text>

            <View className="w-full bg-zinc-900 p-4 rounded-xl my-8 border border-zinc-800">
                <Input>
                    <MapPin color={colors.zinc[400]} size={20}/>
                    <Input.Field
                        placeholder="Para onde?"
                        editable= {stepForm === StepForm.TRIP_DETAILS}
                        onChangeText={ setDestination }
                        value= {destination}
                    />
                </Input>

                <Input>
                    <IconCalendar color={colors.zinc[400]} size={20}/>
                    <Input.Field 
                        placeholder="Quando?"
                        editable= {stepForm === StepForm.TRIP_DETAILS}
                        onFocus={() => Keyboard.dismiss()}
                        showSoftInputOnFocus= {false}
                        onPressIn={() => stepForm === StepForm.TRIP_DETAILS && setShownModal(MODAL.CALENDAR)}
                        value= {selectedDates.formatDatesInText}
                    />
                </Input>

                { stepForm === StepForm.ADD_EMAILS && (
                    <>
                    <View className="border-b py-3 border-zinc-800">
                        <Button
                            variant="secondary"
                            onPress={() => setStepForm(StepForm.TRIP_DETAILS)}
                            className="w-full"
                        >
                            <Button.Title>Alterar local/data</Button.Title>
                            <Settings2 color= {colors.zinc[200]} size= {20} />
                        </Button>
                    </View>

                    <Input>
                        <UserRoundPlus color={colors.zinc[400]} size={20}/>
                        <Input.Field
                            placeholder="Quem estará na viagem?"
                            autoCorrect={false}
                            value={
                                emailsToInvite.length > 0
                                ? `${emailsToInvite.length} pessoas(a) convidada(s)`
                                : ""
                            }
                            onPressIn={() => {
                                Keyboard.dismiss()
                                setShownModal(MODAL.GUESTS)
                            }}
                            showSoftInputOnFocus={false}
                        />
                    </Input>
                    </>
                )}

                <Button className="w-full" onPress={handleNextStepForm} isLoading={ isCreatingTrip }>
                    <Button.Title>
                        {stepForm === StepForm.TRIP_DETAILS 
                            ? "Continuar" 
                            : "Confirmar Viagem"
                        }
                    </Button.Title>
                    <ArrowRight color= {colors.lime[950]} size= {20} />
                </Button>
            </View>

            <Text className="text-zinc-500 font-regular text-center text-base">
                Ao planejar sua viagem pela plann.er você automaticamente concorda com nossos{" "}
                <Text className="text-zinc-300 underline">
                    termos de uso e políticas de privacidade.
                </Text>
            </Text>

            <Modal
                title="Selecionar datas"
                subtitle="Selecione a data de ida e volta da viagem"
                visible= {showModal === MODAL.CALENDAR}
                onClose={() => setShownModal(MODAL.NONE)}
            >
                <View className="gap-4 mt-4">
                    <Calendar 
                        minDate={dayjs().toISOString()}
                        onDayPress={ handleSelectDate }
                        markedDates={selectedDates.dates}
                    />
                    <Button className="w-full" onPress={() => setShownModal(MODAL.NONE)}>
                        <Button.Title>Confirmar</Button.Title>
                    </Button>
                </View>
            </Modal>

            <Modal
                title="Selecionar convidados"
                subtitle="Os convidados irão receber e-mails para confirmar a participação na viagem"
                visible= { showModal === MODAL.GUESTS }
                onClose={ () => setShownModal(MODAL.NONE) }
            >
                <View className="my-2 flex-wrap gap-2 border-b border-zinc-800 py-5 items-start">
                    {
                        emailsToInvite.length > 0 ? (
                            emailsToInvite.map((email) => (
                                <GuestEmail 
                                    key={email}
                                    email={email}
                                    onRemove={() => handleRemoveEmail(email)}
                                />
                            ))
                        ) : (
                            <Text className="text-zinc-600 text-base font-regular">Nenhum e-mail adicionado</Text>
                        )
                    }
                </View>

                <View className="gap-4 mt-4">
                    <Input variant="secondary">
                        <AtSign color={colors.zinc[400]} size={20}/>
                        <Input.Field 
                            placeholder="Digite o e-mail do convidado"
                            keyboardType="email-address"
                            onChangeText={(text) => setEmailToInvite(text.toLowerCase())}
                            value={emailToInvite}
                            returnKeyType="send"
                            onSubmitEditing={ handleAddEmail }
                        />
                    </Input>
                    <Button className="w-full" onPress={ handleAddEmail }>
                        <Button.Title>Convidar</Button.Title>
                    </Button>
                </View>
            </Modal>
        </View>
    )
}