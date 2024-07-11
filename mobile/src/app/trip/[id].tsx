import { useEffect, useState } from "react";
import { Alert, Keyboard, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { type DateData } from "react-native-calendars";

import { CalendarRange, Info, MapPin, Settings2, Calendar as IconCalendar, User } from "lucide-react-native";

import { colors } from "@/styles/colors";
import { calendarUtils, type DatesSelected } from "@/utils/calendarUtils";

import { Loading } from "@/components/loading";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { TripActivities } from "./activities";
import { TripDetails as Details } from "./details";
import { Calendar } from "@/components/calendar";

import { tripServer, type TripDetails } from "@/server/trip-server";
import dayjs from "dayjs";
import { validateInput } from "@/utils/validateInput";
import { participantsServer } from "@/server/participants-server";
import { tripStorage } from "@/storage/trip";

export type TripData = TripDetails & { when: string }

enum MODAL {
    NONE = 0,
    UPDATE_TRIP = 1,
    CALENDAR = 2,
    CONFIRM_ATTENDANCE = 3
}

export default function Trip() {
    // LOADING
    const [ isLoadingTrip, setIsLoadingTrip ] = useState(true) // Await do getTripDetails e UpdateTrip.
    const [ isUpdatingTrip, setIsUpdatingTrip ] = useState(false) // Await de Update Trip.
    const [ isConfirmedAttendance, setIsConfirmedAttendence ] = useState(false) // Await da requisição para confirmar presença do convidado.

    // MODAL
    const [ showModal, setShownModal ] = useState(0) // controlador do modal

    // DATA
    const [ tripDetails, setTripDetails ] = useState({} as TripData) // Get de Trip Details

    const [ option, setOption ] = useState<"activity" | "details">("activity") // Tab menu

    const [ destination, setDestination ] = useState("") // get e update destino da Viagem
    const [ selectedDates, setSelectedDates ] = useState({} as DatesSelected) // Datas selecionadas do calendario para update

    const [ guestName, setGuestName ] = useState("") // Confirmação do convidado
    const [ guestEmail, setGuestEmail ] = useState("") // Confirmação do convidado

    const tripParams = useLocalSearchParams<{ // Parametros da rota
        id: string,
        participant?: string
    }>()
    
    async function getTripDetails() { // Get de Trip Details
        try {
            setIsLoadingTrip(true)

            if(tripParams.participant){
                setShownModal(MODAL.CONFIRM_ATTENDANCE)
            }
            if(!tripParams.id) {
                return router.back()
            }

            const trip = await tripServer.getById(tripParams.id)

            const maxLengthDestination = 12
            const destination = trip.destination.trim().length > maxLengthDestination
            ? trip.destination.slice(0, maxLengthDestination - 3) + "..."
            : trip.destination.trim()

            const starts_at = dayjs(trip.starts_at).format("DD")
            const ends_at = dayjs(trip.ends_at).format("DD")
            const month = dayjs(trip.starts_at).format("MMM")

            setDestination(trip.destination)
            
            setTripDetails({
                ...trip,
                when: `${destination} de ${starts_at} a ${ends_at} de ${month}.`
            })
        } catch (err) {
            console.log(err);
            
        } finally {
            setIsLoadingTrip(false)
        }
    }

    function handleSelectDate(selectedDay: DateData) { // Lida com a seleção das datas no Modal
        const dates = calendarUtils.orderStartsAtAndEndsAt({
            startsAt: selectedDates.startsAt,
            endsAt: selectedDates.endsAt,
            selectedDay
        })

        setSelectedDates(dates)
    }

    async function handleUpdateTrip() { // Solicita a atualização da Viagem
        try {
            if(!tripParams.id) {
                return
            }
            if(!destination || !selectedDates.startsAt || !selectedDates.endsAt) {
                return Alert.alert("Atualizar viagem", "Lembre-se de, além de preencher o destino, selecione data de início e fim da viagem.")
            }

            setIsUpdatingTrip(true)

            await tripServer.update({
                id: tripParams.id,
                destination,
                starts_at: dayjs(selectedDates.startsAt.dateString).toString(),
                ends_at: dayjs(selectedDates.endsAt.dateString).toString()
            })

            Alert.alert("Atualizar viagem", "Viagem atualizada com sucesso!", [
                {
                    text: 'OK',
                    onPress: () => {
                        setShownModal(MODAL.NONE),
                        getTripDetails()
                    },
                }
            ])
        } catch (err) {
            console.log(err);
        } finally {
            setIsUpdatingTrip(false)
        }
    }

    async function handleConfirmedAttendence() { // Lida com a confirmação do convidado
        try {
            if(!tripParams.participant || !tripParams.id) {
                return
            }
            if(!guestName.trim() || !guestEmail.trim()) {
                return Alert.alert("Confirmação", "Preencha nome e e-mail para confirmar a viagem!")
            }
            if(!validateInput.email(guestEmail.trim())) {
                return Alert.alert("Confirmação", "E-mail inválido!")
            }

            setIsConfirmedAttendence(true)
            await participantsServer.confirmTripByParticipantId({
                participantId: tripParams.participant,
                name: guestName,
                email: guestEmail.trim()
            })

            Alert.alert("Confirmação", "Viagem confirmada com sucesso!")

            await tripStorage.save(tripParams.id)

            setShownModal(MODAL.NONE)
        } catch (error) {
            console.log(error)
            Alert.alert("Confirmação", "Não foi possivel confirmar!")
        } finally {
            setIsConfirmedAttendence(false)
        }
    }

    async function handleRemoveTrip() { // Remove a trip do storage do celular
        try {
            Alert.alert("Remover viagem", "Tem certeza que deseja remover a viajem", [
                {
                    text: "Não",
                    style: "cancel"
                },
                {
                    text: "Sim",
                    onPress: async () => {
                        await tripStorage.remove()
                        router.navigate("/")
                    }
                }
            ])
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => { // Após carregar os componentes faz a consulta a TripDetails
        getTripDetails()
    },[])

    if(isLoadingTrip) { // Exibi loading até requisição terminar
        return <Loading/>
    }

    /**
     * Input -> Dados da viagem com Button editar
     * 
     * if("activiy") <Activities> : <Details> // Alterna entre exibições conforme estado
     * 
     * <Tab Menu>
     * 
     *  <Modal> Atualizar viagem
     *      <Modal> Selecionar Data
     * 
     * <Modal> Confirmar presença
     */
    return (
        <View className="flex-1 px-5 pt-16">
            <Input variant="tertiary">
                <MapPin color={colors.zinc[400]} size={20} />
                <Input.Field value= {tripDetails.when} readOnly />

                <TouchableOpacity
                    activeOpacity={0.5}
                    onPress={() => setShownModal(MODAL.UPDATE_TRIP)}
                >
                    <View className="w-9 h-9 bg-zinc-800 items-center justify-center rounded">
                        <Settings2 color={colors.zinc[400]} size={20} />
                    </View>
                </TouchableOpacity>
            </Input>

            { option === "activity" ? (
                <TripActivities tripDetails={tripDetails}/>
            ) : (
                <Details tripId={tripDetails.id}/>
            )}

            <View className="w-full absolute -bottom-1 self-center justify-end pb-5 z-10 bg-zinc-950">
                <View className="w-full flex-row bg-zinc-900 p-4 rounded-lg border border-zinc-800 gap-2">
                    <Button
                        className="flex-1"
                        onPress={() => setOption("activity")}
                        variant={option === "activity" ? "primary" : "secondary"}
                    >
                        <CalendarRange 
                            color={
                                option === "activity" ? colors.lime[950] : colors.zinc[200]
                            }
                            size={20}
                        />
                        <Button.Title>Atividades</Button.Title>
                    </Button>

                    <Button
                        className="flex-1"
                        onPress={() => setOption("details")}
                        variant={option === "details" ? "primary" : "secondary"}
                    >
                        <Info 
                            color={
                                option === "details" ? colors.lime[950] : colors.zinc[200]
                            }
                            size={20}
                        />
                        <Button.Title>Detalhes</Button.Title>
                    </Button>
                </View>
            </View>

            <Modal
                title="Atualizar viagem"
                subtitle="Somente quem criou a viagem pode editar."
                visible= {showModal === MODAL.UPDATE_TRIP}
                onClose={() => setShownModal(MODAL.NONE)}
            >
                <View className="gap-2 my-4">
                    <Input variant="secondary">
                        <MapPin color={colors.zinc[400]} size={20} />
                        <Input.Field
                            placeholder="Para onde?"
                            onChangeText={ setDestination }
                            value={ destination }
                        />
                    </Input>
                    <Input variant="secondary">
                        <IconCalendar color={colors.zinc[400]} size={20} />
                        <Input.Field
                            placeholder="Quando?"
                            value={ selectedDates.formatDatesInText }
                            onPressIn={() => setShownModal(MODAL.CALENDAR)}
                            onFocus={() => Keyboard.dismiss()}
                            
                        />
                    </Input>

                    <Button onPress={ handleUpdateTrip } isLoading={ isUpdatingTrip }>
                        <Button.Title>Atualizar</Button.Title>
                    </Button>

                    <TouchableOpacity activeOpacity={0.8} onPress={ handleRemoveTrip }>
                        <Text className="text-red-400 text-center mt-6">Remover viagem</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Modal
                title="Selecionar datas"
                subtitle="Selecione a data de ida e volta da viagem"
                visible= {showModal === MODAL.CALENDAR}
                onClose={() => setShownModal(MODAL.UPDATE_TRIP)}
            >
                <View className="gap-4 mt-4">
                    <Calendar 
                        minDate={dayjs().toISOString()}
                        onDayPress={ handleSelectDate }
                        markedDates={selectedDates.dates}
                    />
                    <Button className="w-full" onPress={() => setShownModal(MODAL.UPDATE_TRIP)}>
                        <Button.Title>Confirmar</Button.Title>
                    </Button>
                </View>
            </Modal>

            <Modal
                title="Confirmar presença"
                visible= {showModal === MODAL.CONFIRM_ATTENDANCE}
            >
                <View className="gap-4 mt-4">
                    <Text className="text-zinc-400 font-regular leading-6 my-2">
                        Você foi convidado(a) para participar de uma viagem para
                        <Text className="font-semibold text-zinc-100">
                            {" "}{tripDetails.destination}{" "}
                        </Text>
                        nas datas de
                        <Text className="font-semibold text-zinc-100">
                            {" "}{ dayjs(tripDetails.starts_at).date()} a{" "}
                            { dayjs(tripDetails.ends_at).date()} de{" "}
                            { dayjs(tripDetails.ends_at).format("MMMM")}. {"\n\n"}
                        </Text>
                        Para confirmar sua presença na viagem, preencha os dados abaixo:
                    </Text>

                    <Input variant="secondary">
                        <User color={colors.zinc[400]} size={20}/>
                        <Input.Field 
                            placeholder="Seu nome completo"
                            onChangeText={ setGuestName }
                        />
                    </Input>

                    <Input variant="secondary">
                        <User color={colors.zinc[400]} size={20}/>
                        <Input.Field
                            placeholder="E-mail de confirmação"
                            onChangeText={ setGuestEmail }
                        />
                    </Input>

                    <Button
                        isLoading={ isConfirmedAttendance }
                        onPress={ handleConfirmedAttendence }
                    >
                        <Button.Title>Confirmar minha presença</Button.Title>
                    </Button>
                </View>
            </Modal>
        </View>
    )
}